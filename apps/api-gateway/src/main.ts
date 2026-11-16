import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3002;

  app.enableCors({
    origin: ['*'], // Allow all origins (you can specify specific origins if needed)
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true, // Allows sending cookies or authorization headers
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out properties not in the DTO
      forbidNonWhitelisted: true, // Throws 400 error if unrecognized fields are sent
      transform: true, // Automatically converts payloads to DTO instances
    }),
  );

  // 1. Build Swagger Documentation Config
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Microservices API Gateway')
    .setDescription('Central API gateway documenting endpoints for frontend services (Next.js & Angular)')
    .setVersion(configService.get<string>('API_VERSION') ?? '1.0')
    .build();

  // 2. Create and Mount Swagger UI
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`\x1b[34m🚀 API Gateway running on: http://localhost:${port}`);
  console.log(`\x1b[34m📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

await bootstrap();