import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { FilterMovementDto } from './dtos/filter-movements.dto';
import { Inject, forwardRef } from '@nestjs/common';
import { PurchasesService } from '../compras/purchases.service';
import { Movement } from './entity/movement.entity';

@Controller('movements')
export class MovementsController {
  constructor(
    private readonly movementsService: MovementsService,
    @Inject(forwardRef(() => PurchasesService))
    private readonly purchasesService: PurchasesService,
  ) {}

  @Post('return')
  async createReturn(
    @Body() body: { purchaseId: string; reason: string },
  ): Promise<Movement> {
    const purchase = await this.purchasesService.findOne(body.purchaseId);
    if (!purchase) {
      throw new BadRequestException('Purchase not found');
    }
    if (!purchase.products || purchase.products.length === 0) {
      throw new BadRequestException('Purchase has no products');
    }
    return this.movementsService.createMovement({
      movementData: {
        type: 'return',
        productCode: purchase.products[0].code,
        quantity: purchase.products[0].quantity,
        purchase,
        reason: body.reason,
      },
    });
  }

  @Post('exit')
  async createExit(
    @Body() body: { productCode: string; quantity: number; label: string },
  ) {
    return this.movementsService.createMovement({
      movementData: {
        type: 'exit',
        productCode: body.productCode,
        quantity: body.quantity,
        label: body.label,
      },
    });
  }

  @Get()
  async findAll(@Query() filters: FilterMovementDto) {
    return this.movementsService.findAll(filters);
  }

  @Post('direct-entry')
  async createDirectEntry(
    @Body()
    body: {
      productCode: string;
      productName: string;
      productDescription: string;
      quantity: number;
      label?: string;
    },
  ) {
    return this.movementsService.createMovement({
      movementData: {
        type: 'direct-entry',
        productCode: body.productCode,
        quantity: body.quantity,
        label: body.label,
      },
    });
  }
}
