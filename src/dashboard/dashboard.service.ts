/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InventoryService } from '../inventario/inventory.service';

@Injectable()
export class DashboardService {
  constructor(private readonly inventoryService: InventoryService) {}

  async getInventoryChartData() {
    const inventory = await this.inventoryService.getInventory();
    return {
      labels: inventory.map((item) => item.productName),
      datasets: [
        {
          label: 'Existencias',
          data: inventory.map((item) => item.stock),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        },
      ],
    };
  }
}