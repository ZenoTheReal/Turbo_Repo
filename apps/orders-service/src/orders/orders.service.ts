import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Repository, LessThan } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import {
  SERVICES,
  INVENTORY_PATTERNS,
  COUPON_PATTERNS,
  ORDER_EVENTS,
  EMAIL_EVENTS,
  OrderStatus,
  PaymentStatus,
} from '@repo/common';
import { Database } from '../config/database/database.js';
import { Order } from './schema/order.entity.js';
import { OrderItem } from './schema/order-item.entity.js';
import { CreateCheckoutOrderDto } from './dto/create-checkout-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly orderRepository: Repository<Order>;
  private readonly orderItemRepository: Repository<OrderItem>;

  constructor(
    private readonly database: Database,
    @Inject(SERVICES.PRODUCTS) private readonly productsClient: ClientProxy,
    @Inject(SERVICES.EMAIL) private readonly emailClient: ClientProxy,
  ) {
    this.orderRepository = this.database.dataSource.getRepository(Order);
    this.orderItemRepository = this.database.dataSource.getRepository(OrderItem);
  }

  private generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${dateStr}-${randomHex}`;
  }

  async createCheckoutOrder(dto: CreateCheckoutOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cannot create an order without items.');
    }

    // Step 1: Temporarily reserve stock in products-service
    // Throws ConflictException if stock is insufficient and backorders disabled
    await firstValueFrom(
      this.productsClient.send(INVENTORY_PATTERNS.RESERVE, {
        storeId: dto.storeId,
        items: dto.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    );

    // Step 2: Calculate subtotal
    const subtotal = dto.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    // Step 3: Validate coupon if supplied
    let discountAmount = 0;
    let couponCode: string | null = null;

    if (dto.couponCode) {
      try {
        const couponResult = await firstValueFrom(
          this.productsClient.send(COUPON_PATTERNS.VALIDATE, {
            storeId: dto.storeId,
            dto: {
              code: dto.couponCode,
              cartItems: dto.items,
              userId: dto.buyerId,
            },
          }),
        );
        if (couponResult?.valid) {
          discountAmount = Number(couponResult.discountAmount) || 0;
          couponCode = couponResult.code;
        }
      } catch (err: any) {
        this.logger.warn(`Coupon validation failed for code "${dto.couponCode}": ${err.message}`);
      }
    }

    const shippingAmount = Number(dto.shippingAmount || 0);
    const taxAmount = Number(dto.taxAmount || 0);
    const totalAmount = Math.max(
      0,
      Math.round((subtotal - discountAmount + shippingAmount + taxAmount) * 100) / 100,
    );

    // Set 15-minute countdown reservation window
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Step 4: Create Order and OrderItems in PENDING_PAYMENT
    const order = this.orderRepository.create({
      orderNumber: this.generateOrderNumber(),
      storeId: dto.storeId,
      buyerId: dto.buyerId ?? null,
      buyerEmail: dto.buyerEmail,
      buyerName: dto.buyerName,
      buyerPhone: dto.buyerPhone ?? null,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      currency: dto.currency ? dto.currency.toUpperCase() : 'USD',
      subtotal,
      discountAmount,
      couponCode,
      shippingAmount,
      taxAmount,
      totalAmount,
      shippingAddress: dto.shippingAddress ?? null,
      billingAddress: dto.billingAddress ?? null,
      expiresAt,
    });

    const savedOrder = await this.orderRepository.save(order);

    const orderItems = dto.items.map((item) =>
      this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        title: item.title,
        sku: item.sku ?? null,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        imageUrl: item.imageUrl ?? null,
      }),
    );

    savedOrder.items = await this.orderItemRepository.save(orderItems);

    this.emailClient.emit(ORDER_EVENTS.CREATED, {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      buyerEmail: savedOrder.buyerEmail,
      totalAmount: savedOrder.totalAmount,
    });

    this.logger.log(`Created pending checkout order ${savedOrder.orderNumber} (Expires at: ${expiresAt.toISOString()})`);
    return savedOrder;
  }

  async markOrderPaid(orderId: string, stripePaymentIntentId?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PAID) {
      return order; // Idempotent check
    }

    // Step 1: Permanently deduct stock in products-service
    await firstValueFrom(
      this.productsClient.send(INVENTORY_PATTERNS.DEDUCT, {
        storeId: order.storeId,
        items: order.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
      }),
    );

    // Step 2: Transition order status
    order.status = OrderStatus.PAID;
    order.paymentStatus = PaymentStatus.PAID;
    order.paidAt = new Date();
    if (stripePaymentIntentId) {
      order.stripePaymentIntentId = stripePaymentIntentId;
    }

    const updated = await this.orderRepository.save(order);

    // Step 3: Emit events
    this.emailClient.emit(ORDER_EVENTS.PAID, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      storeId: updated.storeId,
      buyerEmail: updated.buyerEmail,
      totalAmount: updated.totalAmount,
    });

    this.emailClient.emit(EMAIL_EVENTS.SEND_ORDER_CONFIRMATION, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      email: updated.buyerEmail,
      buyerName: updated.buyerName,
      totalAmount: updated.totalAmount,
      items: updated.items,
    });

    this.logger.log(`Order ${updated.orderNumber} successfully marked PAID. Stock permanently deducted.`);
    return updated;
  }

  async expireOrder(orderId: string): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order || order.status !== OrderStatus.PENDING_PAYMENT) {
      return null;
    }

    // Step 1: Release held stock back to products-service
    await firstValueFrom(
      this.productsClient.send(INVENTORY_PATTERNS.RELEASE, {
        storeId: order.storeId,
        items: order.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
      }),
    );

    // Step 2: Transition order status to EXPIRED
    order.status = OrderStatus.EXPIRED;
    order.paymentStatus = PaymentStatus.FAILED;
    const updated = await this.orderRepository.save(order);

    this.emailClient.emit(ORDER_EVENTS.EXPIRED, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      storeId: updated.storeId,
    });

    this.logger.log(`Order ${updated.orderNumber} expired. Held stock released back to store.`);
    return updated;
  }

  async cancelOrder(orderId: string, storeId?: string): Promise<Order> {
    const where: any = { id: orderId };
    if (storeId) {
      where.storeId = storeId;
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      return order;
    }

    // Release stock if order was holding stock
    if (order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PAID) {
      await firstValueFrom(
        this.productsClient.send(INVENTORY_PATTERNS.RELEASE, {
          storeId: order.storeId,
          items: order.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
          })),
        }),
      );
    }

    order.status = OrderStatus.CANCELLED;
    const updated = await this.orderRepository.save(order);

    this.emailClient.emit(ORDER_EVENTS.CANCELLED, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      storeId: updated.storeId,
    });

    this.logger.log(`Order ${updated.orderNumber} cancelled. Stock restored.`);
    return updated;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, storeId?: string): Promise<Order> {
    const where: any = { id: orderId };
    if (storeId) {
      where.storeId = storeId;
    }

    const order = await this.orderRepository.findOne({ where });
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" was not found.`);
    }

    order.status = status;
    return this.orderRepository.save(order);
  }

  async updateStripeSessionId(orderId: string, stripeSessionId: string): Promise<Order> {
    const order = await this.findById(orderId);
    order.stripeSessionId = stripeSessionId;
    return this.orderRepository.save(order);
  }

  async findById(orderId: string, storeId?: string): Promise<Order> {
    const where: any = { id: orderId };
    if (storeId) {
      where.storeId = storeId;
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" was not found.`);
    }
    return order;
  }

  async findSellerOrders(storeId: string, query: QueryOrdersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.storeId = :storeId', { storeId });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.search) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(order.orderNumber) LIKE :search OR LOWER(order.buyerEmail) LIKE :search OR LOWER(order.buyerName) LIKE :search)',
        { search },
      );
    }

    const validSortFields = ['createdAt', 'totalAmount', 'status'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`order.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBuyerOrders(buyerId: string, query: QueryOrdersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const [items, total] = await this.orderRepository.findAndCount({
      where: { buyerId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Background sweeper: finds all pending orders past their 15-minute countdown
   * and auto-expires them to restore held stock.
   */
  async sweepExpiredOrders(): Promise<number> {
    const expiredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: LessThan(new Date()),
      },
      relations: { items: true },
      take: 50,
    });

    if (expiredOrders.length === 0) {
      return 0;
    }

    for (const order of expiredOrders) {
      try {
        await this.expireOrder(order.id);
      } catch (err: any) {
        this.logger.error(`Failed to auto-expire order ${order.orderNumber}: ${err.message}`);
      }
    }

    this.logger.log(`Swept and released stock for ${expiredOrders.length} expired orders.`);
    return expiredOrders.length;
  }
}
