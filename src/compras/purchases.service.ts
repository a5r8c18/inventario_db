/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

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

  async createPurchase(purchaseData: {
    products: Array<{ expirationDate?: string | null; [key: string]: any }>;
  }): Promise<Purchase> {
    // Validar y limpiar las fechas de vencimiento
    purchaseData.products = purchaseData.products.map((product) => {
      const { expirationDate, ...rest } = product;
      let validExpirationDate: string | null = null;

      if (expirationDate) {
        const date = new Date(expirationDate);
        if (!isNaN(date.getTime())) {
          validExpirationDate = date.toISOString();
        }
      }

      return { ...rest, expirationDate: validExpirationDate };
    });

    // Guardar la compra en la base de datos
    const savedPurchase = await this.purchasesRepository.save(purchaseData);

    // Generar informe de recepción
    await this.reportsService.createReceptionReport(savedPurchase);

    // Registrar movimientos de entrada y asegurar producto en inventario
    for (const product of purchaseData.products) {
      // 1. Buscar o crear el producto en inventario por su código
      let inventoryProduct = await this.inventoryService
        .findByCode(product.code)
        .catch(() => null);
      if (!inventoryProduct) {
        inventoryProduct = await this.inventoryService.createProductIfNotExists(
          product.code,
          product.description,
        );
      }

      // 2. Registrar el movimiento de entrada
      await this.movementsService.createMovement({
        movementData: {
          type: 'entry',
          productCode: inventoryProduct.productCode,
          quantity: product.quantity,
          purchase: savedPurchase,
        },
      });

      // 3. Actualizar inventario
      await this.inventoryService.updateInventory(
        product.code,
        product.description,
        product.quantity,
        'entry',
      );
    }

    return savedPurchase;
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
