/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../inventario/inventory.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // Exporta el servicio si otros módulos lo usan
})
export class SettingsModule {}
