import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERNS, OrderStatus } from '@repo/common';
import { OrdersService } from './orders.service.js';
import { CreateCheckoutOrderDto } from './dto/create-checkout-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(ORDER_PATTERNS.CREATE_CHECKOUT)
  async createCheckoutOrder(@Payload() dto: CreateCheckoutOrderDto) {
    return this.ordersService.createCheckoutOrder(dto);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ALL_SELLER)
  async findSellerOrders(@Payload() data: { storeId: string; query: QueryOrdersDto }) {
    return this.ordersService.findSellerOrders(data.storeId, data.query);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ALL_BUYER)
  async findBuyerOrders(@Payload() data: { buyerId: string; query: QueryOrdersDto }) {
    return this.ordersService.findBuyerOrders(data.buyerId, data.query);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ONE)
  async findOne(@Payload() data: { id: string; storeId?: string }) {
    return this.ordersService.findById(data.id, data.storeId);
  }

  @MessagePattern(ORDER_PATTERNS.MARK_PAID)
  async markPaid(@Payload() data: { orderId: string; stripePaymentIntentId?: string }) {
    return this.ordersService.markOrderPaid(data.orderId, data.stripePaymentIntentId);
  }

  @MessagePattern(ORDER_PATTERNS.EXPIRE_ORDER)
  async expireOrder(@Payload() data: { orderId: string }) {
    return this.ordersService.expireOrder(data.orderId);
  }

  @MessagePattern(ORDER_PATTERNS.CANCEL)
  async cancelOrder(@Payload() data: { orderId: string; storeId?: string }) {
    return this.ordersService.cancelOrder(data.orderId, data.storeId);
  }

  @MessagePattern(ORDER_PATTERNS.UPDATE_STATUS)
  async updateStatus(@Payload() data: { orderId: string; status: OrderStatus; storeId?: string }) {
    return this.ordersService.updateOrderStatus(data.orderId, data.status, data.storeId);
  }
}
