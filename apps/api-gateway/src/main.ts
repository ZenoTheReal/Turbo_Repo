import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3002;
  app.use(cookieParser());

  const rawCorsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins: string[] = rawCorsOrigins
    ? rawCorsOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, origin?: boolean) => void,
    ) => {
      // Allow server-to-server, curl, mobile clients with no origin header
      if (!requestOrigin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*' || allowed === requestOrigin) {
          return true;
        }

        // Support wildcard subdomain patterns (e.g. http://*.localhost:3000 or https://*.omnistore.com)
        if (allowed.includes('*')) {
          const escapedPattern = allowed
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
          const regex = new RegExp(`^${escapedPattern}$`, 'i');
          return regex.test(requestOrigin);
        }

        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
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

  app.setGlobalPrefix('api');

  // 1. Build Swagger Documentation Config
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Microservices API Gateway')
    .setDescription('Central API gateway documenting endpoints for frontend services (Next.js & Angular)')
    .setVersion(configService.get<string>('API_VERSION') ?? '1.0')
    .addBearerAuth()
    .build();

  // 2. Create and Mount Swagger UI
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`\x1b[34m🚀 API Gateway running on: http://localhost:${port}`);
  console.log(`\x1b[34m📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

await bootstrap();