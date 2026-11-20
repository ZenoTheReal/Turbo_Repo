import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES, ORDER_PATTERNS, OrderStatus, UserRole } from '@repo/common';
import { StoresService } from '../stores/stores.service.js';
import { StripeService } from '../config/stripe/stripe.service.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class OrdersGatewayService {
  constructor(
    @Inject(SERVICES.ORDERS) private readonly ordersClient: ClientProxy,
    private readonly storesService: StoresService,
    private readonly stripeService: StripeService,
  ) {}

  async checkoutStorefront(
    subdomain: string,
    dto: any,
    user?: CurrentUserPayload,
  ) {
    const store = await this.storesService.findBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException(`Storefront "${subdomain}" was not found.`);
    }

    if (store.isOpen === false) {
      throw new BadRequestException(
        store.maintenanceNotice || 'This store is temporarily closed for maintenance.',
      );
    }

    // Shopify-style gating: Store must have onboarded Stripe Connect
    if (!store.stripeAccountId || !store.isPayoutsEnabled) {
      throw new BadRequestException(
        'This store is currently completing payment onboarding and cannot process live checkouts.',
      );
    }

    // Step 1: Create order in orders-service (this reserves stock in products-service)
    const orderPayload = {
      ...dto,
      storeId: store.id,
      buyerId: user?.id ?? dto.buyerId,
      buyerEmail: dto.buyerEmail ?? user?.email,
      buyerName: dto.buyerName ?? user?.email?.split('@')[0] ?? 'Guest Shopper',
    };

    const order = await firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.CREATE_CHECKOUT, orderPayload),
    );

    // Step 2: Create Stripe Checkout Session
    const storeUrl = this.stripeService.resolveStoreUrl(store);
    const session = await this.stripeService.createCheckoutSession({
      mode: 'payment',
      customer_email: order.buyerEmail,
      line_items: order.items.map((item: any) => ({
        price_data: {
          currency: (order.currency || 'USD').toLowerCase(),
          product_data: {
            name: item.title,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${storeUrl}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeUrl}/checkout/cancel?orderId=${order.id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30-minute Stripe session TTL
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeId: store.id,
      },
      payment_intent_data: {
        transfer_data: {
          destination: store.stripeAccountId,
        },
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      expiresAt: order.expiresAt,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async findSellerOrders(sellerId: string, query: any) {
    const store = await this.storesService.findByOwnerId(sellerId);
    if (!store) {
      throw new ForbiddenException('You do not have an active storefront.');
    }
    return firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.FIND_ALL_SELLER, {
        storeId: store.id,
        query,
      }),
    );
  }

  async findBuyerOrders(buyerId: string, query: any) {
    return firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.FIND_ALL_BUYER, {
        buyerId,
        query,
      }),
    );
  }

  async findOrderById(orderId: string, user: CurrentUserPayload) {
    const order = await firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.FIND_ONE, { id: orderId }),
    );

    // Only buyer, store seller, or admin can view
    const isBuyer = order.buyerId === user.id || order.buyerEmail === user.email;
    if (!isBuyer && user.role !== UserRole.ADMIN) {
      const store = await this.storesService.findByOwnerId(user.id);
      if (!store || store.id !== order.storeId) {
        throw new ForbiddenException('You are not authorized to view this order.');
      }
    }

    return order;
  }

  async updateSellerOrderStatus(
    orderId: string,
    status: OrderStatus,
    sellerId: string,
  ) {
    const store = await this.storesService.findByOwnerId(sellerId);
    if (!store) {
      throw new ForbiddenException('You do not have an active storefront.');
    }

    return firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.UPDATE_STATUS, {
        orderId,
        status,
        storeId: store.id,
      }),
    );
  }

  async cancelOrder(orderId: string, user: CurrentUserPayload) {
    const order = await this.findOrderById(orderId, user);
    return firstValueFrom(
      this.ordersClient.send(ORDER_PATTERNS.CANCEL, {
        orderId: order.id,
        storeId: order.storeId,
      }),
    );
  }
}
