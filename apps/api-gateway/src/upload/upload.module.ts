import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller.js';
import { StorageModule } from '../config/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [UploadController],
})
export class UploadModule {}
