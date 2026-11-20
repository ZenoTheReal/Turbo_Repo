import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module.js';
import { CatalogService } from './catalog.service.js';
import { CatalogController } from './catalog.controller.js';
import { StorefrontCatalogController } from './storefront-catalog.controller.js';

@Module({
  imports: [StoresModule],
  controllers: [CatalogController, StorefrontCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
