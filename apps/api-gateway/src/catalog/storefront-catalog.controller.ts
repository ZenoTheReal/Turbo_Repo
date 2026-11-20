import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';

@ApiTags('Public Storefront Catalog')
@Controller('storefronts/:subdomain')
export class StorefrontCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get public hierarchical category tree for a storefront' })
  async getCategories(@Param('subdomain') subdomain: string) {
    return this.catalogService.getStorefrontCategories(subdomain);
  }

  @Get('products')
  @ApiOperation({ summary: 'Search and browse public products of a storefront' })
  async getProducts(@Param('subdomain') subdomain: string, @Query() query: any) {
    return this.catalogService.getStorefrontProducts(subdomain, query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product details by slug for a storefront' })
  async getProductBySlug(
    @Param('subdomain') subdomain: string,
    @Param('slug') slug: string,
  ) {
    return this.catalogService.getStorefrontProductBySlug(subdomain, slug);
  }

  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate coupon and calculate discounts for cart items' })
  async validateCoupon(
    @Param('subdomain') subdomain: string,
    @Body() dto: any,
  ) {
    return this.catalogService.validateStorefrontCoupon(subdomain, dto);
  }
}
