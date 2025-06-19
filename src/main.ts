/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  // Habilitar CORS
  app.enableCors({
    origin: 'http://localhost:4200', // Permitir solicitudes desde el frontend Angular
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Métodos permitidos
    allowedHeaders: 'Content-Type, Accept, Authorization', // Cabeceras permitidas
    credentials: true, // Permitir credenciales (si es necesario)
  });
  await app.listen(3000);
}
bootstrap();
