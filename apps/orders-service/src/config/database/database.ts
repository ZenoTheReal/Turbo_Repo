import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Order } from '../../orders/schema/order.entity.js';
import { OrderItem } from '../../orders/schema/order-item.entity.js';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  public dataSource: DataSource;

  constructor(private readonly configService: ConfigService) {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST'),
      port: Number(this.configService.get<number>('DATABASE_PORT', 5432)),
      username: this.configService.get<string>('DATABASE_USER'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME', 'postgres'),
      entities: [Order, OrderItem],
      synchronize: this.configService.get<string>('NODE_ENV') !== 'production',
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.dataSource.initialize();
      console.log('\x1b[35m[Orders Database] Connected to Supabase PostgreSQL successfully\x1b[0m');
    } catch (error) {
      console.error('\x1b[31m[Orders Database] Database connection failed:\x1b[0m', error);
    }
  }

  async onModuleDestroy() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
