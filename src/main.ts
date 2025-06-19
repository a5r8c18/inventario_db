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
    origin: [process.env.FRONTEND_URL || 'http://localhost:4200'], // Permitir solicitudes desde ambos URLs
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Métodos permitidos
    allowedHeaders: 'Content-Type, Accept, Authorization', // Cabeceras permitidas
    credentials: true, // Permitir credenciales (si es necesario)
  });
  const port = process.env.PORT || 3000; // Usa puerto dinámico de Render
  await app.listen(port);
  console.log(`Aplicación corriendo en el puerto ${port}`);
}
bootstrap();
