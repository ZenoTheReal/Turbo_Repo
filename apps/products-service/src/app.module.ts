import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database/database.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { CouponsModule } from './coupons/coupons.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/products-service/.env'],
    }),
    DatabaseModule,
    CategoriesModule,
    ProductsModule,
    CouponsModule,
  ],
})
export class AppModule {}
