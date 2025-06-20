/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { Inventory } from './inventory.entity';
import { FilterInventoryDto } from './dtos/filter-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) {}

  async updateInventory(
    productCode: string,
    productName: string,
    quantity: number,
    type: string,
  ): Promise<Inventory> {
    let inventory = await this.inventoryRepository.findOneBy({ productCode });

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        productCode,
        productName,
        entries: 0,
        exits: 0,
        stock: 0,
      });
    }

    // Asegurarse que quantity sea un número válido
    const validQuantity = Number(quantity);
    if (isNaN(validQuantity)) {
      throw new Error('La cantidad debe ser un número válido');
    }

    if (type === 'entry') {
      inventory.entries = Number(inventory.entries) + validQuantity;
    } else if (type === 'exit' || type === 'return') {
      inventory.exits = Number(inventory.exits) - validQuantity; // Negativo para restar
    }

    // Recalcular stock asegurando que sean números
    inventory.stock = Number(inventory.entries) - Number(inventory.exits);
    
    return this.inventoryRepository.save(inventory);
  }

  async findAll(filters: FilterInventoryDto = {}): Promise<Inventory[]> {
    const where: any = {};

    if (filters.fromDate && filters.toDate) {
      where.createdAt = Between(
        new Date(filters.fromDate),
        new Date(filters.toDate),
      );
    }
    if (filters.product) {
      where.productName = Like(`%${filters.product}%`);
    }
    if (filters.expirationDate) {
      where.expirationDate = new Date(filters.expirationDate);
    }

    return this.inventoryRepository.find({ where });
  }

  async getInventory(): Promise<Inventory[]> {
    return this.findAll(); // Llama a findAll sin filtros
  }

  async createProductIfNotExists(
    productCode: string,
    productName: string,
  ): Promise<Inventory> {
    let inventory = await this.inventoryRepository.findOneBy({ productCode });
    if (!inventory) {
      inventory = this.inventoryRepository.create({
        productCode,
        productName,
        entries: 0,
        exits: 0,
        stock: 0,
      });
      inventory = await this.inventoryRepository.save(inventory);
    }
    return inventory;
  }

  async findByCode(productCode: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOneBy({ productCode });
    if (!inventory) {
      throw new Error(`Inventory with productCode ${productCode} not found.`);
    }
    return inventory;
  }

  async createProduct(data: {
    productCode: string;
    productName: string;
    productDescription: string;
    stock: number;
  }) {
    const product = this.inventoryRepository.create({
      productCode: data.productCode,
      productName: data.productName,
      stock: data.stock,
    });
    return this.inventoryRepository.save(product);
  }
}