import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dns from 'dns';

// Configurar servidores DNS públicos para resolver dominios
dns.setServers([
  '8.8.8.8',       // Google DNS
  '8.8.4.4',       // Google DNS secundario
  '1.1.1.1',       // Cloudflare DNS
]);

console.log('🌐 DNS configurado:', dns.getServers());

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Confiar en proxies para obtener la IP real del cliente
  app.set('trust proxy', true);

  // CORS debe ir ANTES de los archivos estáticos para que los cubra también
  app.enableCors();

  // Servir archivos estáticos desde la carpeta uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Ejemplo')
    .setDescription('Documentación de los servicios de mi API')
    .setVersion('1.0')
    .addBearerAuth() // Si usas autenticación por token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalInterceptors(new LoggingInterceptor());

  // app.enableCors({
  //   origin: 'https://www.crecemos.com.pe',
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   credentials: true, 
  //   optionsSuccessStatus: 200, // <-- Esto es importante para algunos navegadores
  // });

app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const flatten = (errs: any[], prefix = ''): string[] =>
        errs.flatMap(e => {
          const path = prefix ? `${prefix}.${e.property}` : e.property;
          if (e.children?.length) return flatten(e.children, path);
          return [`${path}: ${Object.values(e.constraints || {}).join(', ')}`];
        });
      const messages = flatten(errors);
      console.error('❌ VALIDATION DETAIL:', JSON.stringify(messages, null, 2));
      return new BadRequestException(messages.join(', '));
    },
  }));

 

  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
