/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { InventoryModule } from '../inventario/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
