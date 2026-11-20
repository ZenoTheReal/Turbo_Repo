import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersExpiryService } from './orders-expiry.service.js';
import { OrdersController } from './orders.controller.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExpiryService],
  exports: [OrdersService],
})
export class OrdersModule {}
