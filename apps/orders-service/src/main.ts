import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3003);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host, port },
  });

  await app.listen();
  console.log(`\x1b[35m📦 Orders Service is listening on TCP ${host}:${port}\x1b[0m`);
}

await bootstrap();