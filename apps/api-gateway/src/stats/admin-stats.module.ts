import { Module } from '@nestjs/common';
import { AdminStatsController } from './admin-stats.controller.js';

@Module({
  controllers: [AdminStatsController],
})
export class AdminStatsModule {}
