import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICES } from '@repo/common';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICES.PRODUCTS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'products_queue',
            queueOptions: { durable: true },
            exchange: configService.get<string>('RABBITMQ_EXCHANGE', 'ecommerce_exchange'),
            exchangeType: 'topic',
          },
        }),
      },
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
    ]),
  ],
  exports: [ClientsModule],
})
export class MicroserviceClientsModule {}
