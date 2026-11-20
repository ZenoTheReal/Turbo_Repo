import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { of } from 'rxjs';
import { DatabaseModule } from '../src/config/database/database.module.js';
import { Database } from '../src/config/database/database.js';
import { MicroserviceClientsModule } from '../src/config/microservices/clients.module.js';
import { OrdersModule } from '../src/orders/orders.module.js';
import { OrdersService } from '../src/orders/orders.service.js';
import {
  SERVICES,
  INVENTORY_PATTERNS,
  COUPON_PATTERNS,
  OrderStatus,
  PaymentStatus,
} from '@repo/common';

describe('Orders Service E2E Lifecycle & Auto-Expiry Suite', () => {
  let moduleRef: TestingModule;
  let database: Database;
  let ordersService: OrdersService;

  const mockProductsClient = {
    send: vi.fn(),
  };

  const mockEmailClient = {
    emit: vi.fn(),
  };

  const testStoreId = randomUUID();
  const testBuyerId = randomUUID();

  beforeAll(async () => {
    // Default mock behavior for Products microservice
    mockProductsClient.send.mockImplementation((pattern: string) => {
      if (pattern === INVENTORY_PATTERNS.RESERVE) {
        return of({ success: true, reserved: true });
      }
      if (pattern === INVENTORY_PATTERNS.DEDUCT) {
        return of({ success: true });
      }
      if (pattern === INVENTORY_PATTERNS.RELEASE) {
        return of({ success: true });
      }
      if (pattern === COUPON_PATTERNS.VALIDATE) {
        return of({ valid: true, code: 'SAVE10', discountAmount: 10 });
      }
      return of({});
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', 'apps/orders-service/.env'],
        }),
        DatabaseModule,
        MicroserviceClientsModule,
        OrdersModule,
      ],
    })
      .overrideProvider(SERVICES.PRODUCTS)
      .useValue(mockProductsClient)
      .overrideProvider(SERVICES.EMAIL)
      .useValue(mockEmailClient)
      .compile();

    database = moduleRef.get(Database);
    ordersService = moduleRef.get(OrdersService);

    await database.onModuleInit();
  }, 30000);

  afterAll(async () => {
    if (database) {
      await database.onModuleDestroy();
    }
  });

  describe('Order Creation & Stock Hold (Phase 1)', () => {
    it('should create order in PENDING_PAYMENT status and hold inventory with 15-min expiry', async () => {
      const order = await ordersService.createCheckoutOrder({
        storeId: testStoreId,
        buyerId: testBuyerId,
        buyerEmail: 'shopper@example.com',
        buyerName: 'Alice Shopper',
        items: [
          {
            productId: randomUUID(),
            title: 'Wireless Headphones',
            price: 150.0,
            quantity: 1,
          },
          {
            productId: randomUUID(),
            title: 'USB-C Cable',
            price: 25.0,
            quantity: 2,
          },
        ],
        couponCode: 'SAVE10',
        shippingAmount: 10,
        taxAmount: 5,
      });

      expect(order.id).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(order.paymentStatus).toBe(PaymentStatus.PENDING);

      // Subtotal: 150 + 50 = 200. Discount: 10. Shipping: 10. Tax: 5. Total: 205
      expect(Number(order.subtotal)).toBe(200);
      expect(Number(order.discountAmount)).toBe(10);
      expect(Number(order.totalAmount)).toBe(205);

      // Expiry window must be ~15 minutes in the future
      const now = Date.now();
      const expiresAtMs = new Date(order.expiresAt!).getTime();
      expect(expiresAtMs).toBeGreaterThan(now + 14 * 60 * 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(now + 16 * 60 * 1000);

      // Verify INVENTORY_PATTERNS.RESERVE was invoked
      expect(mockProductsClient.send).toHaveBeenCalledWith(
        INVENTORY_PATTERNS.RESERVE,
        expect.objectContaining({
          storeId: testStoreId,
        }),
      );
    });

    it('should reject checkout if inventory reservation fails', async () => {
      mockProductsClient.send.mockImplementationOnce((pattern: string) => {
        if (pattern === INVENTORY_PATTERNS.RESERVE) {
          throw new Error('Insufficient stock for product "Limited Sneaker".');
        }
        return of({});
      });

      await expect(
        ordersService.createCheckoutOrder({
          storeId: testStoreId,
          buyerEmail: 'shopper@example.com',
          buyerName: 'Alice Shopper',
          items: [
            {
              productId: randomUUID(),
              title: 'Limited Sneaker',
              price: 300.0,
              quantity: 1,
            },
          ],
        }),
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('Payment Finalization & Stock Deduction (Phase 2A)', () => {
    it('should mark order PAID, set paidAt, and permanently deduct stock', async () => {
      const order = await ordersService.createCheckoutOrder({
        storeId: testStoreId,
        buyerId: testBuyerId,
        buyerEmail: 'shopper@example.com',
        buyerName: 'Alice Shopper',
        items: [
          {
            productId: randomUUID(),
            title: 'Mechanical Keyboard',
            price: 120.0,
            quantity: 1,
          },
        ],
      });

      const updated = await ordersService.markOrderPaid(order.id, 'pi_test_123456');

      expect(updated.status).toBe(OrderStatus.PAID);
      expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
      expect(updated.paidAt).toBeDefined();
      expect(updated.stripePaymentIntentId).toBe('pi_test_123456');

      // Verify permanent deduction
      expect(mockProductsClient.send).toHaveBeenCalledWith(
        INVENTORY_PATTERNS.DEDUCT,
        expect.objectContaining({
          storeId: testStoreId,
        }),
      );

      // Verify idempotency on duplicate webhook deliveries
      const secondCall = await ordersService.markOrderPaid(order.id, 'pi_test_123456');
      expect(secondCall.status).toBe(OrderStatus.PAID);
    });
  });

  describe('Order Cancellation & Manual Stock Release', () => {
    it('should cancel pending order and release held inventory', async () => {
      const order = await ordersService.createCheckoutOrder({
        storeId: testStoreId,
        buyerId: testBuyerId,
        buyerEmail: 'shopper@example.com',
        buyerName: 'Alice Shopper',
        items: [
          {
            productId: randomUUID(),
            title: 'Coffee Beans',
            price: 18.0,
            quantity: 2,
          },
        ],
      });

      const cancelled = await ordersService.cancelOrder(order.id, testStoreId);
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);

      expect(mockProductsClient.send).toHaveBeenCalledWith(
        INVENTORY_PATTERNS.RELEASE,
        expect.objectContaining({
          storeId: testStoreId,
        }),
      );
    });
  });

  describe('Background Order Expiration Sweeper (Phase 2B)', () => {
    it('should find expired pending orders, mark them EXPIRED, and auto-release stock', async () => {
      // Create order with expiresAt in the past
      const order = await ordersService.createCheckoutOrder({
        storeId: testStoreId,
        buyerId: testBuyerId,
        buyerEmail: 'stale-shopper@example.com',
        buyerName: 'Bob Stale',
        items: [
          {
            productId: randomUUID(),
            title: 'Vintage Vinyl',
            price: 35.0,
            quantity: 1,
          },
        ],
      });

      // Manually backdate expiresAt to simulate 15 minutes passing
      const repo = database.dataSource.getRepository(order.constructor);
      await repo.update(order.id, {
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute in the past
      });

      // Run background sweeper
      const sweptCount = await ordersService.sweepExpiredOrders();
      expect(sweptCount).toBeGreaterThan(0);

      // Verify order is now EXPIRED
      const expiredOrder = await ordersService.findById(order.id);
      expect(expiredOrder.status).toBe(OrderStatus.EXPIRED);
      expect(expiredOrder.paymentStatus).toBe(PaymentStatus.FAILED);

      // Verify held stock was released
      expect(mockProductsClient.send).toHaveBeenCalledWith(
        INVENTORY_PATTERNS.RELEASE,
        expect.objectContaining({
          storeId: testStoreId,
        }),
      );
    });
  });

  describe('Order Retrieval & Queries', () => {
    it('should return paginated orders for seller and buyer', async () => {
      const sellerOrders = await ordersService.findSellerOrders(testStoreId, {
        page: 1,
        limit: 10,
      });

      expect(sellerOrders.items.length).toBeGreaterThan(0);
      expect(sellerOrders.total).toBeGreaterThan(0);

      const buyerOrders = await ordersService.findBuyerOrders(testBuyerId, {
        page: 1,
        limit: 10,
      });

      expect(buyerOrders.items.length).toBeGreaterThan(0);
      expect(buyerOrders.total).toBeGreaterThan(0);
    });
  });
});
