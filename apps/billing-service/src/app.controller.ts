import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ORDER_EVENTS } from '@repo/common';

@Controller()
export class AppController {
  @EventPattern(ORDER_EVENTS.CREATED)
  handleOrderCreated(@Payload() orderData: any) {
    console.log('[Billing Service] Received order_created event:', orderData);
    console.log(`[Billing Service] Generating invoice for Order ID: ${orderData.id}...`);
  }
}