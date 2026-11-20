import { Module } from '@nestjs/common';
import { StoresService } from './stores.service.js';
import { StoresController } from './stores.controller.js';
import { StorageModule } from '../config/storage/storage.module.js';
import { StripeModule } from '../config/stripe/stripe.module.js';

@Module({
  imports: [StorageModule, StripeModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
