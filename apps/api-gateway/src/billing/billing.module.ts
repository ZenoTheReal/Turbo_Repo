import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module.js';
import { BillingGatewayService } from './billing.service.js';
import { SellerBillingController, AdminBillingController } from './billing.controller.js';

@Module({
  imports: [StoresModule],
  controllers: [SellerBillingController, AdminBillingController],
  providers: [BillingGatewayService],
  exports: [BillingGatewayService],
})
export class BillingGatewayModule {}
