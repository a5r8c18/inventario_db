/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../inventario/inventory.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) {}

  async setStockLimit(productId: string, stockLimit: number) {
    const product = await this.inventoryRepository.findOneBy({
      productCode: productId,
    });
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    // Suponiendo que agregas un campo stockLimit en Inventory
    product['stockLimit'] = stockLimit;
    return this.inventoryRepository.save(product);
  }
}
