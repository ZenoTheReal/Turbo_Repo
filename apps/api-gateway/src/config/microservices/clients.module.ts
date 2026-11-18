import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICES } from '@repo/common';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICES.EMAIL,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'email_queue',
            queueOptions: { durable: true },
            exchange: configService.get<string>('RABBITMQ_EXCHANGE', 'ecommerce_exchange'),
            exchangeType: 'topic',
          },
        }),
      },
      {
        name: SERVICES.ORDERS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'orders_queue',
            queueOptions: { durable: true },
            exchange: configService.get<string>('RABBITMQ_EXCHANGE', 'ecommerce_exchange'),
            exchangeType: 'topic',
          },
        }),
      },
      {
        name: SERVICES.BILLING,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'billing_queue',
            queueOptions: { durable: true },
            exchange: configService.get<string>('RABBITMQ_EXCHANGE', 'ecommerce_exchange'),
            exchangeType: 'topic',
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MicroserviceClientsModule { }