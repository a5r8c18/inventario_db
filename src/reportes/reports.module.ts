/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionReport } from './reception-report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DeliveryReport } from '../DeliveryReport/delivery-report.entity'; // <-- importa tu entidad

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceptionReport, DeliveryReport]), // <-- agrega aquí
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService], // Exporta el servicio si otros módulos lo usan
})
export class ReportsModule {}