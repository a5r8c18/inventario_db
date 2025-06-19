/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from './entity/movement.entity';
import { PurchasesService } from '../compras/purchases.service';
import { ReportsService } from '../reportes/reports.service';
import { InventoryService } from '../inventario/inventory.service';
import { Purchase } from '../compras/entity/purchase.entity';
import { Inventory } from 'src/inventario/inventory.entity';
import { FilterMovementDto } from './dtos/filter-movements.dto';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private movementsRepository: Repository<Movement>,
    private purchasesService: PurchasesService,
    private reportsService: ReportsService,
    private inventoryService: InventoryService,
  ) {}

  async createMovement({
    movementData,
  }: {
    movementData: {
      type: string;
      productCode: string;
      quantity: number;
      purchase?: Purchase;
      label?: string;
      reason?: string;
    };
  }): Promise<Movement> {
    const movement = this.movementsRepository.create({
      ...movementData,
      createdAt: new Date(),
    });
    return this.movementsRepository.save(movement);
  }

  async findAll(filters: FilterMovementDto = {}): Promise<Movement[]> {
    const queryBuilder = this.movementsRepository.createQueryBuilder('movement');
    queryBuilder.leftJoinAndSelect('movement.product', 'product');
    queryBuilder.leftJoinAndSelect('movement.purchase', 'purchase');

    // Filter by date range
    if (filters.fromDate) {
      queryBuilder.andWhere('movement.createdAt >= :fromDate', {
        fromDate: new Date(filters.fromDate),
      });
    }
    if (filters.toDate) {
      queryBuilder.andWhere('movement.createdAt <= :toDate', {
        toDate: new Date(filters.toDate),
      });
    }

    // Filter by product name
    if (filters.product) {
      queryBuilder.andWhere('product.productName LIKE :productName', {
        productName: `%${filters.product}%`,
      });
    }

    // Filter by expiration date
    if (filters.expirationDate) {
      queryBuilder.andWhere('product.expirationDate = :expirationDate', {
        expirationDate: new Date(filters.expirationDate),
      });
    }

    // Ordenar por fecha de creación
    queryBuilder.orderBy('movement.createdAt', 'DESC');
    
    // Obtener movimientos con sus relaciones
    return queryBuilder.getMany();
  }

  async registerDirectEntry(
    productCode: string,
    productName: string,
    productDescription: string,
    quantity: number,
    label?: string,
  ): Promise<Movement> {
    let inventoryProduct: Inventory;
    try {
      inventoryProduct = await this.inventoryService.findByCode(productCode);
    } catch (e) {
      // Si no existe, créalo con los datos recibidos
      const createdProducts: Inventory | Inventory[] =
        await this.inventoryService.createProduct({
          productCode,
          productName,
          productDescription,
          stock: 0,
        });
      if (Array.isArray(createdProducts)) {
        inventoryProduct = createdProducts[0];
      } else {
        inventoryProduct = createdProducts;
      }
    }

    // Si no existe, créalo
    if (!inventoryProduct) {
      inventoryProduct = await this.inventoryService.createProduct({
        productCode,
        productName,
        productDescription,
        stock: 0, // o el campo que uses
      });
    }

    // Registrar el movimiento
    const movement = this.movementsRepository.create({
      type: 'entry',
      product: inventoryProduct,
      productCode: inventoryProduct.productCode,
      quantity,
      label,
      createdAt: new Date(),
    });
    await this.movementsRepository.save(movement);

    // Actualizar inventario
    await this.inventoryService.updateInventory(
      productCode,
      '',
      quantity,
      'entry',
    );

    return movement;
  }
}
