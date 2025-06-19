import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { FilterMovementDto } from './dtos/filter-movements.dto';

@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post('return')
  createReturn(@Body() body: { purchaseId: string; reason: string }) {
    return this.movementsService.createReturn(body.purchaseId, body.reason);
  }

  @Post('exit')
  createExit(
    @Body() body: { productCode: string; quantity: number; label: string },
  ) {
    return this.movementsService.registerExit({
      movementData: {
        type: 'exit',
        productCode: body.productCode,
        quantity: body.quantity,
        label: body.label,
      },
    });
  }

  @Get()
  findAll(@Query() filters: FilterMovementDto) {
    return this.movementsService.findAll(filters);
  }

  @Post('direct-entry')
  createDirectEntry(
    @Body()
    body: {
      productCode: string;
      productName: string;
      productDescription: string;
      quantity: number;
      label?: string;
    },
  ) {
    return this.movementsService.registerDirectEntry(
      body.productCode,
      body.productName,
      body.productDescription,
      body.quantity,
      body.label,
    );
  }
}
