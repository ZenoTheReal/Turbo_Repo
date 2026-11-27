import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module.js';
import { StripeModule } from '../config/stripe/stripe.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { OrdersGatewayService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { SellerOrdersController } from './seller-orders.controller.js';

@Module({
  imports: [StoresModule, StripeModule, SettingsModule],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersGatewayService],
  exports: [OrdersGatewayService],
})
export class OrdersGatewayModule {}
