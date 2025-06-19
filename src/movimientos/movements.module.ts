/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entity/movement.entity';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { PurchasesModule } from '../compras/purchases.module';
import { ReportsModule } from '../reportes/reports.module';
import { InventoryModule } from '../inventario/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movement]),
    forwardRef(() => PurchasesModule),
    ReportsModule,
    InventoryModule,
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService], // Exporta el servicio si otros módulos lo usan
})
export class MovementsModule {}
