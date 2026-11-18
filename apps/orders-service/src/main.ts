import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const rmqUrl =
    process.env.RABBITMQ_URL ||
    'amqps://hhcnxsxj:IDl1Hsm1f5f4ONF7lEChCTO_HXYgxgyn@puffin.rmq2.cloudamqp.com/hhcnxsxj';
  const exchange = process.env.RABBITMQ_EXCHANGE || 'ecommerce_exchange';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'orders_queue',
      queueOptions: { durable: true },
      exchange,
      exchangeType: 'topic',
      wildcards: true,
    },
  });

  await app.listen();
  console.log('\x1b[35m📦 Orders Service connected to CloudAMQP (Topic: ecommerce_exchange)\x1b[0m');
}

await bootstrap();