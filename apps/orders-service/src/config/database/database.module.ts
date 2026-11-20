import { Module, Global } from '@nestjs/common';
import { Database } from './database.js';

@Global()
@Module({
  providers: [Database],
  exports: [Database],
})
export class DatabaseModule {}
