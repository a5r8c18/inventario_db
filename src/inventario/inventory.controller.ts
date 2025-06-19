/* eslint-disable prettier/prettier */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { FilterInventoryDto } from './dtos/filter-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
export class InventoryController {
  inventoryRepository: any;
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() filters: FilterInventoryDto) {
    return this.inventoryService.findAll(filters);
  }
}
