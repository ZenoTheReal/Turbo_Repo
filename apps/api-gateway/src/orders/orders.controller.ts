import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { OrdersGatewayService } from './orders.service.js';

@ApiTags('Orders & Checkout')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersGatewayService) {}

  // 1. Initiate Storefront Checkout & Stripe Payment Session
  @Post('storefronts/:subdomain/checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate checkout on a storefront, reserve stock, and generate Stripe Checkout URL' })
  @ApiResponse({ status: 201, description: 'Checkout session created with Stripe redirect URL' })
  async checkout(
    @Param('subdomain') subdomain: string,
    @Body() dto: any,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.ordersService.checkoutStorefront(subdomain, dto, user);
  }

  // 2. Buyer Order History
  @Get('orders/my-orders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[BUYER] Get personal order history' })
  async getMyOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.ordersService.findBuyerOrders(user.id, query);
  }

  // 3. Get Order by ID
  @Get('orders/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order details by ID' })
  async getOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOrderById(id, user);
  }

  // 4. Cancel Order
  @Post('orders/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel order and release reserved stock' })
  async cancelOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelOrder(id, user);
  }
}
