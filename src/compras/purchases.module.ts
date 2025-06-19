/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entity/purchase.entity';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { ReportsModule } from '../reportes/reports.module';
import { MovementsModule } from '../movimientos/movements.module'; // <--- IMPORTANTE
import { InventoryModule } from '../inventario/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase]),
    ReportsModule,
    forwardRef(() => MovementsModule), // <--- AGREGA ESTO
    InventoryModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService], // Exporta el servicio si otros módulos lo usan
})
export class PurchasesModule {}
