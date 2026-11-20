import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service.js';
import { StripeController } from './stripe.controller.js';
import { Store } from '../../stores/schema/store.entity.js';
import { PlatformSettings } from '../../settings/schema/platform-settings.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Store, PlatformSettings])],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
