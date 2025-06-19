/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('inventory-chart')
  getInventoryChartData() {
    return this.dashboardService.getInventoryChartData();
  }
}