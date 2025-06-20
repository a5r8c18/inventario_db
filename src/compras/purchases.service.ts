/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entity/purchase.entity';
import { ReportsService } from '../reportes/reports.service';
import { MovementsService } from '../movimientos/movements.service';
import { InventoryService } from '../inventario/inventory.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private purchasesRepository: Repository<Purchase>,
    private reportsService: ReportsService,
    @Inject(forwardRef(() => MovementsService))
    private movementsService: MovementsService,
    private inventoryService: InventoryService,
  ) {}

  async createPurchase(purchaseData: any): Promise<Purchase> {
    try {
      // Validar amount y transformar expirationDate
      for (const product of purchaseData.products) {
        const expectedAmount = product.quantity * product.unitPrice;
        if (product.amount !== expectedAmount) {
          throw new Error(`Invalid amount for product ${product.code}. Expected ${expectedAmount}, got ${product.amount}`);
        }
        // Transformar expirationDate: cadena vacía o inválida a null
        if (!product.expirationDate || product.expirationDate === '' || isNaN(new Date(product.expirationDate).getTime())) {
          product.expirationDate = null;
        } else {
          product.expirationDate = new Date(product.expirationDate);
        }
      }

      // Guardar la compra en la base de datos
      const savedPurchase = await this.purchasesRepository.save(purchaseData);

      // Generar informe de recepción
      await this.reportsService.createReceptionReport(savedPurchase);

      // Registrar movimientos de entrada y asegurar producto en inventario
      for (const product of purchaseData.products) {
        let inventoryProduct = await this.inventoryService
          .findByCode(product.code)
          .catch(() => null);
        if (!inventoryProduct) {
          inventoryProduct = await this.inventoryService.createProductIfNotExists(
            product.code,
            product.description,
          );
        }

        await this.movementsService.createMovement({
          movementData: {
            type: 'entry',
            productCode: inventoryProduct.productCode,
            quantity: product.quantity,
            purchase: savedPurchase,
          },
        });

        await this.inventoryService.updateInventory(
          product.code,
          product.description,
          product.quantity,
          'entry',
        );
      }

      return savedPurchase;
    } catch (error) {
      console.error('Error in createPurchase:', error);
      throw new Error(`Failed to create purchase: ${error.message}`);
    }
  }
  async findOne(id: string): Promise<Purchase> {
    const purchase = await this.purchasesRepository.findOne({
      where: { id },
      relations: ['products', 'receptionReport'],
    });
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }
    return purchase;
  }

  async updateById(id: string, purchaseData: any): Promise<Purchase> {
    const purchase = await this.purchasesRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    Object.assign(purchase, purchaseData);
    return this.purchasesRepository.save(purchase);
  }

  async findAll(): Promise<Purchase[]> {
    return this.purchasesRepository.find({
      relations: ['products', 'receptionReport'],
    });
  }
}
