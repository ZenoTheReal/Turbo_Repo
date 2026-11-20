import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  SERVICES,
  PRODUCT_PATTERNS,
  CATEGORY_PATTERNS,
  COUPON_PATTERNS,
  ProductStatus,
} from '@repo/common';
import { StoresService } from '../stores/stores.service.js';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(SERVICES.PRODUCTS) private readonly productsClient: ClientProxy,
    private readonly storesService: StoresService,
  ) {}

  private async getSellerStoreId(sellerId: string): Promise<string> {
    const store = await this.storesService.findByOwnerId(sellerId);
    if (!store) {
      throw new ForbiddenException('You do not have an active storefront.');
    }
    return store.id;
  }

  // --- Seller Categories ---
  async createCategory(sellerId: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(CATEGORY_PATTERNS.CREATE, { storeId, dto }));
  }

  async updateCategory(sellerId: string, id: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(CATEGORY_PATTERNS.UPDATE, { storeId, id, dto }));
  }

  async findSellerCategories(sellerId: string, asTree = false) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(CATEGORY_PATTERNS.FIND_ALL, { storeId, asTree, includeInactive: true }));
  }

  async deleteCategory(sellerId: string, id: string) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(CATEGORY_PATTERNS.DELETE, { storeId, id }));
  }

  // --- Seller Products ---
  async createProduct(sellerId: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.CREATE, { storeId, dto }));
  }

  async updateProduct(sellerId: string, id: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.UPDATE, { storeId, id, dto }));
  }

  async findSellerProducts(sellerId: string, query: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.FIND_ALL, { storeId, query }));
  }

  async findSellerProductById(sellerId: string, id: string) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.FIND_ONE, { storeId, id }));
  }

  async deleteProduct(sellerId: string, id: string) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.DELETE, { storeId, id }));
  }

  // --- Seller Coupons ---
  async createCoupon(sellerId: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(COUPON_PATTERNS.CREATE, { storeId, dto }));
  }

  async updateCoupon(sellerId: string, id: string, dto: any) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(COUPON_PATTERNS.UPDATE, { storeId, id, dto }));
  }

  async findSellerCoupons(sellerId: string) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(COUPON_PATTERNS.FIND_ALL, { storeId }));
  }

  async deleteCoupon(sellerId: string, id: string) {
    const storeId = await this.getSellerStoreId(sellerId);
    return firstValueFrom(this.productsClient.send(COUPON_PATTERNS.DELETE, { storeId, id }));
  }

  // --- Public Storefront Operations ---
  async getStorefrontCategories(subdomain: string) {
    const store = await this.storesService.getStorefrontBySubdomain(subdomain);
    return firstValueFrom(this.productsClient.send(CATEGORY_PATTERNS.FIND_ALL, { storeId: store.id, asTree: true }));
  }

  async getStorefrontProducts(subdomain: string, query: any) {
    const store = await this.storesService.getStorefrontBySubdomain(subdomain);
    return firstValueFrom(
      this.productsClient.send(PRODUCT_PATTERNS.FIND_ALL, {
        storeId: store.id,
        query: { ...query, status: ProductStatus.PUBLISHED },
      }),
    );
  }

  async getStorefrontProductBySlug(subdomain: string, slug: string) {
    const store = await this.storesService.getStorefrontBySubdomain(subdomain);
    return firstValueFrom(this.productsClient.send(PRODUCT_PATTERNS.FIND_BY_SLUG, { storeId: store.id, slug }));
  }

  async validateStorefrontCoupon(subdomain: string, dto: any) {
    const store = await this.storesService.getStorefrontBySubdomain(subdomain);
    return firstValueFrom(this.productsClient.send(COUPON_PATTERNS.VALIDATE, { storeId: store.id, dto }));
  }
}
