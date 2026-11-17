import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3005,
    },
  });

  await app.listen();
  console.log('\x1b[33m📧 Email Service is listening on TCP port 3005\x1b[0m');
}

await bootstrap();
