import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MicroserviceClientsModule } from './config/microservices/clients.module.js';
import { UploadModule } from './upload/upload.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StoresModule } from './stores/stores.module.js';
import { StripeModule } from './config/stripe/stripe.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OrdersGatewayModule } from './orders/orders.module.js';
import { BillingGatewayModule } from './billing/billing.module.js';
import { FaqsModule } from './faqs/faqs.module.js';
import { CmsModule } from './cms/cms.module.js';
import { AdminStatsModule } from './stats/admin-stats.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api-gateway/.env']
    }),
    DatabaseModule,
    MicroserviceClientsModule,
    UsersModule,
    AuthModule,
    UploadModule,
    SettingsModule,
    StoresModule,
    StripeModule,
    CatalogModule,
    OrdersGatewayModule,
    BillingGatewayModule,
    FaqsModule,
    CmsModule,
    AdminStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
