import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database/database.module.js';
import { MicroserviceClientsModule } from './config/microservices/clients.module.js';
import { OrdersModule } from './orders/orders.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/orders-service/.env'],
    }),
    DatabaseModule,
    MicroserviceClientsModule,
    OrdersModule,
  ],
})
export class AppModule {}
