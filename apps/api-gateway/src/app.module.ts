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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
