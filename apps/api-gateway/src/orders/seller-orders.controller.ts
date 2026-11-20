import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, OrderStatus } from '@repo/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { OrdersGatewayService } from './orders.service.js';

@ApiTags('Seller Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersGatewayService) {}

  @Get()
  @ApiOperation({ summary: '[SELLER] View customer orders for own storefront' })
  async getStoreOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.ordersService.findSellerOrders(user.id, query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[SELLER] Update order fulfillment status (e.g. PROCESSING, SHIPPED, DELIVERED)' })
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateSellerOrderStatus(id, status, user.id);
  }
}
