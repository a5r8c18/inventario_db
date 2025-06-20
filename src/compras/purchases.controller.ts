import { Controller, Post, Body, Put, Param } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { Purchase } from './entity/purchase.entity';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async createPurchase(@Body() purchaseData: any): Promise<Purchase> {
    return await this.purchasesService.createPurchase(purchaseData);
  }

  @Put(':id')
  async updatePurchase(
    @Param('id') id: string,
    @Body() purchaseData: any,
  ): Promise<Purchase> {
    return await this.purchasesService.updateById(id, purchaseData);
  }
}
