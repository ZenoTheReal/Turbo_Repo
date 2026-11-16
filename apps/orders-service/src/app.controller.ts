import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERNS } from '@repo/common';

@Controller()
export class AppController {
  @MessagePattern(ORDER_PATTERNS.FIND_ALL)
  getOrders(@Payload() data: any) {
    console.log('📦 [Orders Service] Received RPC request to find all orders');
    return [
      { id: 'ord-101', item: 'Mechanical Keyboard', price: 120, status: 'CONFIRMED' },
      { id: 'ord-102', item: 'Gaming Mouse', price: 60, status: 'PENDING' },
    ];
  }
}