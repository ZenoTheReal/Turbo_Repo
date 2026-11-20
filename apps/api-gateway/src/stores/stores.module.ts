import { Module } from '@nestjs/common';
import { StoresService } from './stores.service.js';
import { StoresController } from './stores.controller.js';
import { StorageModule } from '../config/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
