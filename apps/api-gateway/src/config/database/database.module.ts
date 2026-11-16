import { Module, Global } from '@nestjs/common';
import { Database } from './database.js';

@Global()
@Module({
  providers: [Database],
  exports: [Database], // Exported so other services can use it!
})
export class DatabaseModule {}