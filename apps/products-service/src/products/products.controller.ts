import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PRODUCT_PATTERNS, INVENTORY_PATTERNS } from '@repo/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern(PRODUCT_PATTERNS.CREATE)
  async createProduct(@Payload() data: { storeId: string; dto: CreateProductDto }) {
    return this.productsService.createProduct(data.storeId, data.dto);
  }

  @MessagePattern(PRODUCT_PATTERNS.UPDATE)
  async updateProduct(@Payload() data: { storeId: string; id: string; dto: UpdateProductDto }) {
    return this.productsService.updateProduct(data.storeId, data.id, data.dto);
  }

  @MessagePattern(PRODUCT_PATTERNS.FIND_ALL)
  async findProducts(@Payload() data: { storeId: string; query: QueryProductDto }) {
    return this.productsService.findProducts(data.storeId, data.query);
  }

  @MessagePattern(PRODUCT_PATTERNS.FIND_ONE)
  async findProduct(@Payload() data: { storeId: string; id: string }) {
    return this.productsService.findById(data.storeId, data.id);
  }

  @MessagePattern(PRODUCT_PATTERNS.FIND_BY_SLUG)
  async findProductBySlug(@Payload() data: { storeId: string; slug: string }) {
    return this.productsService.findBySlug(data.storeId, data.slug);
  }

  @MessagePattern(PRODUCT_PATTERNS.DELETE)
  async deleteProduct(@Payload() data: { storeId: string; id: string }) {
    return this.productsService.deleteProduct(data.storeId, data.id);
  }

  @MessagePattern(INVENTORY_PATTERNS.RESERVE)
  async reserveStock(
    @Payload() data: { storeId: string; items: { productId: string; variantId?: string; quantity: number }[] },
  ) {
    return this.productsService.reserveStock(data.storeId, data.items);
  }

  @MessagePattern(INVENTORY_PATTERNS.RELEASE)
  async releaseStock(
    @Payload() data: { storeId: string; items: { productId: string; variantId?: string; quantity: number }[] },
  ) {
    return this.productsService.releaseStock(data.storeId, data.items);
  }

  @MessagePattern(INVENTORY_PATTERNS.DEDUCT)
  async deductStock(
    @Payload() data: { storeId: string; items: { productId: string; variantId?: string; quantity: number }[] },
  ) {
    return this.productsService.deductStock(data.storeId, data.items);
  }
}
