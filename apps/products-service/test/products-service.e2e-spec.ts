import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DatabaseModule } from '../src/config/database/database.module.js';
import { Database } from '../src/config/database/database.js';
import { CategoriesModule } from '../src/categories/categories.module.js';
import { CategoriesService } from '../src/categories/categories.service.js';
import { ProductsModule } from '../src/products/products.module.js';
import { ProductsService } from '../src/products/products.service.js';
import { CouponsModule } from '../src/coupons/coupons.module.js';
import { CouponsService } from '../src/coupons/coupons.service.js';
import { DiscountType, CouponScope, ProductStatus } from '@repo/common';

describe('Products Service E2E Integration Suite', () => {
  let moduleRef: TestingModule;
  let database: Database;
  let categoriesService: CategoriesService;
  let productsService: ProductsService;
  let couponsService: CouponsService;

  const testStoreId = randomUUID();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', 'apps/products-service/.env'],
        }),
        DatabaseModule,
        CategoriesModule,
        ProductsModule,
        CouponsModule,
      ],
    }).compile();

    database = moduleRef.get(Database);
    categoriesService = moduleRef.get(CategoriesService);
    productsService = moduleRef.get(ProductsService);
    couponsService = moduleRef.get(CouponsService);

    await database.onModuleInit();
  }, 30000);

  afterAll(async () => {
    if (database) {
      await database.onModuleDestroy();
    }
  });

  describe('Categories Hierarchy & Subcategories', () => {
    let parentCatId: string;
    let subCatId: string;

    it('should create root category', async () => {
      const parent = await categoriesService.createCategory(testStoreId, {
        name: 'Footwear',
        slug: `footwear-${Date.now()}`,
      });
      parentCatId = parent.id;
      expect(parent.id).toBeDefined();
      expect(parent.parentId).toBeNull();
    });

    it('should create nested subcategory referencing parentId', async () => {
      const sub = await categoriesService.createCategory(testStoreId, {
        name: 'Sneakers',
        slug: `sneakers-${Date.now()}`,
        parentId: parentCatId,
      });
      subCatId = sub.id;
      expect(sub.id).toBeDefined();
      expect(sub.parentId).toBe(parentCatId);
    });

    it('should construct a recursive category tree', async () => {
      const tree = await categoriesService.findCategoryTree(testStoreId);
      const rootNode = tree.find((c) => c.id === parentCatId);
      expect(rootNode).toBeDefined();
      expect(rootNode?.children.some((child) => child.id === subCatId)).toBe(true);
    });

    it('should prevent circular parent self-referencing', async () => {
      await expect(
        categoriesService.updateCategory(testStoreId, parentCatId, {
          parentId: parentCatId,
        }),
      ).rejects.toThrow('A category cannot be its own parent.');
    });
  });

  describe('Product Catalog & Pricing Validation', () => {
    it('should reject product creation when sellingPrice > mrp', async () => {
      await expect(
        productsService.createProduct(testStoreId, {
          title: 'Overpriced Shoe',
          mrp: 100,
          sellingPrice: 150,
        }),
      ).rejects.toThrow('Selling price cannot exceed the Maximum Retail Price (MRP).');
    });

    it('should create product with valid mrp and sellingPrice', async () => {
      const product = await productsService.createProduct(testStoreId, {
        title: 'Running Shoes',
        slug: `running-shoes-${Date.now()}`,
        mrp: 120,
        sellingPrice: 99.99,
        stockQuantity: 15,
        trackInventory: true,
        status: ProductStatus.PUBLISHED,
      });

      expect(product.id).toBeDefined();
      expect(Number(product.sellingPrice)).toBe(99.99);
      expect(Number(product.mrp)).toBe(120);
    });

    it('should support querying products with pagination and filters', async () => {
      const result = await productsService.findProducts(testStoreId, {
        page: 1,
        limit: 10,
        status: ProductStatus.PUBLISHED,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should bubble up products when querying parent category', async () => {
      const parent = await categoriesService.createCategory(testStoreId, {
        name: 'Electronics Hub',
        slug: `electronics-hub-${Date.now()}`,
      });

      const sub = await categoriesService.createCategory(testStoreId, {
        name: 'Smartphones Hub',
        slug: `smartphones-hub-${Date.now()}`,
        parentId: parent.id,
      });

      const product = await productsService.createProduct(testStoreId, {
        title: 'Flagship Smartphone Pro',
        slug: `flagship-phone-${Date.now()}`,
        mrp: 999,
        sellingPrice: 899,
        categoryId: sub.id,
        status: ProductStatus.PUBLISHED,
      });

      const parentQueryResult = await productsService.findProducts(testStoreId, {
        categoryId: parent.id,
      });
      expect(parentQueryResult.items.some((p) => p.id === product.id)).toBe(true);

      const subQueryResult = await productsService.findProducts(testStoreId, {
        categoryId: sub.id,
      });
      expect(subQueryResult.items.some((p) => p.id === product.id)).toBe(true);
    });
  });

  describe('Scoped Coupons Calculation', () => {
    it('should validate PERCENTAGE coupon and calculate accurate discount with max cap', async () => {
      const couponCode = `SAVE20-${Date.now()}`;
      await couponsService.createCoupon(testStoreId, {
        code: couponCode,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxDiscountAmount: 30,
        appliesTo: CouponScope.ALL_PRODUCTS,
        minOrderAmount: 50,
      });

      const result = await couponsService.validateCoupon(testStoreId, {
        code: couponCode,
        cartItems: [
          { productId: 'p1', price: 100, quantity: 2 },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(30);
      expect(result.finalSubtotal).toBe(170);
    });

    it('should reject coupon when eligible items do not meet minOrderAmount', async () => {
      const couponCode = `MIN100-${Date.now()}`;
      await couponsService.createCoupon(testStoreId, {
        code: couponCode,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 20,
        appliesTo: CouponScope.ALL_PRODUCTS,
        minOrderAmount: 100,
      });

      await expect(
        couponsService.validateCoupon(testStoreId, {
          code: couponCode,
          cartItems: [{ productId: 'p1', price: 40, quantity: 1 }],
        }),
      ).rejects.toThrow('does not meet the minimum order requirement');
    });

    it('should filter items based on CouponScope.SPECIFIC_CATEGORIES', async () => {
      const allowedCatId = randomUUID();
      const otherCatId = randomUUID();
      const couponCode = `FASHION15-${Date.now()}`;

      await couponsService.createCoupon(testStoreId, {
        code: couponCode,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 15,
        appliesTo: CouponScope.SPECIFIC_CATEGORIES,
        applicableCategoryIds: [allowedCatId],
        minOrderAmount: 20,
      });

      const result = await couponsService.validateCoupon(testStoreId, {
        code: couponCode,
        cartItems: [
          { productId: 'p1', categoryId: allowedCatId, price: 50, quantity: 1 },
          { productId: 'p2', categoryId: otherCatId, price: 100, quantity: 1 },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.eligibleSubtotal).toBe(50);
      expect(result.discountAmount).toBe(15);
      expect(result.finalSubtotal).toBe(135);
    });
  });

  describe('Inventory Reservation & Stock Operations', () => {
    it('should prevent inventory reservation if stock is insufficient and backorder disabled', async () => {
      const product = await productsService.createProduct(testStoreId, {
        title: 'Limited Edition Jacket',
        slug: `limited-jacket-${Date.now()}`,
        mrp: 200,
        sellingPrice: 180,
        stockQuantity: 2,
        trackInventory: true,
        allowBackorder: false,
      });

      await expect(
        productsService.reserveStock(testStoreId, [{ productId: product.id, quantity: 5 }]),
      ).rejects.toThrow('Insufficient stock');
    });

    it('should successfully reserve and deduct inventory on confirmed orders', async () => {
      const product = await productsService.createProduct(testStoreId, {
        title: 'Everyday Socks',
        slug: `socks-${Date.now()}`,
        mrp: 10,
        sellingPrice: 8,
        stockQuantity: 10,
        trackInventory: true,
      });

      const reservation = await productsService.reserveStock(testStoreId, [{ productId: product.id, quantity: 3 }]);
      expect(reservation.reserved).toBe(true);

      await productsService.deductStock(testStoreId, [{ productId: product.id, quantity: 3 }]);
      const updated = await productsService.findById(testStoreId, product.id);
      expect(updated.stockQuantity).toBe(7);
    });

    it('should restore inventory on stock release', async () => {
      const product = await productsService.createProduct(testStoreId, {
        title: 'Canvas Backpack',
        slug: `backpack-${Date.now()}`,
        mrp: 50,
        sellingPrice: 40,
        stockQuantity: 5,
        trackInventory: true,
      });

      await productsService.deductStock(testStoreId, [{ productId: product.id, quantity: 2 }]);
      let current = await productsService.findById(testStoreId, product.id);
      expect(current.stockQuantity).toBe(3);

      await productsService.releaseStock(testStoreId, [{ productId: product.id, quantity: 2 }]);
      current = await productsService.findById(testStoreId, product.id);
      expect(current.stockQuantity).toBe(5);
    });
  });
});
