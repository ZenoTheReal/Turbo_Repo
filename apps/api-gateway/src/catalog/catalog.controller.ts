import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@repo/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { CatalogService } from './catalog.service.js';

@ApiTags('Seller Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // --- Categories ---
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[SELLER] Create a product category or subcategory' })
  async createCategory(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createCategory(user.id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: '[SELLER] List all categories for own store' })
  async findCategories(@CurrentUser() user: CurrentUserPayload, @Query('asTree') asTree?: boolean) {
    return this.catalogService.findSellerCategories(user.id, asTree);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: '[SELLER] Update a category' })
  async updateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '[SELLER] Delete a category' })
  async deleteCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.deleteCategory(user.id, id);
  }

  // --- Products ---
  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[SELLER] Create a new product with pricing & inventory' })
  async createProduct(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createProduct(user.id, dto);
  }

  @Get('products')
  @ApiOperation({ summary: '[SELLER] List products with pagination, search, and filtering' })
  async findProducts(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.catalogService.findSellerProducts(user.id, query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: '[SELLER] Get product by ID' })
  async findProductById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.findSellerProductById(user.id, id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: '[SELLER] Update product pricing, inventory, or details' })
  async updateProduct(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '[SELLER] Soft-delete a product' })
  async deleteProduct(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.deleteProduct(user.id, id);
  }

  // --- Coupons ---
  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[SELLER] Create a targeted promotional coupon' })
  async createCoupon(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createCoupon(user.id, dto);
  }

  @Get('coupons')
  @ApiOperation({ summary: '[SELLER] List coupons for own store' })
  async findCoupons(@CurrentUser() user: CurrentUserPayload) {
    return this.catalogService.findSellerCoupons(user.id);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: '[SELLER] Update a coupon' })
  async updateCoupon(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateCoupon(user.id, id, dto);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: '[SELLER] Delete a coupon' })
  async deleteCoupon(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.deleteCoupon(user.id, id);
  }
}
