import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrdersExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersExpiryService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit() {
    this.logger.log('Starting background order expiration sweeper (Interval: 60s)...');
    // Run every 60 seconds
    this.timer = setInterval(async () => {
      try {
        await this.ordersService.sweepExpiredOrders();
      } catch (err: any) {
        this.logger.error(`Error during order expiry sweep: ${err.message}`);
      }
    }, 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Stopped background order expiration sweeper.');
    }
  }
}
