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
  
  async createReturn(purchaseId: string, reason: string): Promise<Movement> {
    if (!reason) {
      throw new BadRequestException(
        'El motivo de la devolución es obligatorio',
      );
    }

    const purchase = await this.purchasesService.findOne(purchaseId);
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    // Registrar devolución
    for (const product of purchase.products) {
      // Busca el producto en el inventario
      const inventoryProduct = await this.inventoryService.findByCode(
        product.code,
      );
      const movement = this.movementsRepository.create({
        type: 'return',
        product: inventoryProduct, // relación
        productCode: inventoryProduct.productCode, // clave foránea
        quantity: -product.quantity,
        reason,
        purchase,
        createdAt: new Date(),
      });
      await this.movementsRepository.save(movement);

      // Actualizar inventario
      await this.inventoryService.updateInventory(
        product.code,
        product.description,
        -product.quantity,
        'return',
      );
    }

    // Cancelar compra y limpiar productos
    purchase.status = 'canceled';
    purchase.products = [];
    await this.purchasesService.updateById(purchase.id, purchase);

    // Eliminar informe de recepción
    await this.reportsService.deleteByPurchaseId(purchaseId);

    const movement = await this.movementsRepository.findOne({
      where: { purchase: { id: purchaseId }, type: 'return' },
    });
    if (!movement) {
      throw new BadRequestException('No se pudo registrar la devolución');
    }
    return movement;
  }

  // The following code was outside of any method and caused an error.
  // If you want to implement an "exit" movement, move this logic into a method, for example:

  async registerExit({
    movementData,
  }: {
    movementData: {
      type: string;
      productCode: string;
      quantity: number;
      label?: string;
    };
  }): Promise<Movement> {
    const inventoryProduct = await this.inventoryService.findByCode(
      movementData.productCode,
    );

    // Verificar si hay suficiente stock disponible
    if (!inventoryProduct || inventoryProduct.stock < Math.abs(movementData.quantity)) {
      throw new BadRequestException(
        `No hay suficiente stock para esta salida. Stock disponible: ${inventoryProduct?.stock || 0}`
      );
    }

    // 1. Registrar el movimiento de salida
    const movement = this.movementsRepository.create({
      ...movementData,
      product: inventoryProduct,
      createdAt: new Date(),
      quantity: -Math.abs(movementData.quantity), // salida negativa
    });
    await this.movementsRepository.save(movement);

    // 2. Actualizar inventario
    await this.inventoryService.updateInventory(
      movementData.productCode,
      inventoryProduct.productDescription || '',
      -Math.abs(movementData.quantity),
      'exit',
    );

    // 3. Generar vale de entrega SIEMPRE que haya salida
    await this.reportsService.createDeliveryReport({
      document: `VE-${Date.now()}`,
      warehouse: inventoryProduct.warehouse || '',
      products: [
        {
          code: inventoryProduct.productCode,
          description:
            inventoryProduct.productName ||
            inventoryProduct.productDescription ||
            '',
          unit: inventoryProduct.productUnit || '',
          quantity: movementData.quantity,
          unitPrice: inventoryProduct.unitPrice || 0,
          amount: (inventoryProduct.unitPrice || 0) * movementData.quantity,
        },
      ],
      entity: '',
    });

    return movement;
  }

  async findAll(filters: FilterMovementDto): Promise<Movement[]> {
    const queryBuilder = this.movementsRepository.createQueryBuilder('movement');
    queryBuilder.leftJoinAndSelect('movement.product', 'product');

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
    
    // Obtener movimientos con su ID de compra
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
