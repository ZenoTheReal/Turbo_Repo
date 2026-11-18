// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { StorageModule } from '../config/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Exported so AuthModule can use it!
})
export class UsersModule { }