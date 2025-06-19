import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './common/mail/mail.module';
import { InventoryModule } from './inventario/inventory.module';
import { SettingsModule } from './settings/settings.module';
import { MovementsModule } from './movimientos/movements.module';
import { ReportsModule } from './reportes/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PurchasesModule } from './compras/purchases.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', '1234'),
        database: configService.get<string>('DB_NAME', 'garcia_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Registra la entidad User aquí
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true), // Usa variable de entorno, predeterminado a true solo para desarrollo
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Ruta absoluta a la carpeta uploads
      serveRoot: '/uploads', // Prefijo para acceder a los archivos (por ejemplo, http://localhost:3000/uploads/...)
    }),
    AuthModule, // Incluye el módulo de autenticación
    InventoryModule,
    SettingsModule,
    MovementsModule,
    ReportsModule,
    DashboardModule,
    PurchasesModule,
  ],
})
export class AppModule {}
