/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('stock-limit')
  setStockLimit(@Body() body: { productId: string; stockLimit: number }) {
    return this.settingsService.setStockLimit(body.productId, body.stockLimit);
  }
}
