import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Ejemplo')
    .setDescription('Documentación de los servicios de mi API')
    .setVersion('1.0')
    .addBearerAuth() // Si usas autenticación por token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors(); // Habilita CORS

  // app.enableCors({
  //   origin: 'https://www.crecemos.com.pe',
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   credentials: true,
  //   optionsSuccessStatus: 200, // <-- Esto es importante para algunos navegadores
  // });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    whitelist: true,
    forbidNonWhitelisted: false,
  }));

 

  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
