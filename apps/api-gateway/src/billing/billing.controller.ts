import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@repo/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { BillingGatewayService } from './billing.service.js';
import { GatewayRequestPayoutDto } from './dto/request-payout.dto.js';

@ApiTags('Seller Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@Controller('seller/billing')
export class SellerBillingController {
  constructor(private readonly billingService: BillingGatewayService) {}

  @Get('summary')
  @ApiOperation({ summary: '[SELLER] Get revenue, commission fees, and available balance summary' })
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getSellerSummary(user.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: '[SELLER] List issued invoices for own storefront' })
  async getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.billingService.getSellerInvoices(user.id, query);
  }

  @Get('ledger')
  @ApiOperation({ summary: '[SELLER] View itemized ledger credits, platform fees, and payouts' })
  async getLedger(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.billingService.getSellerLedger(user.id, query);
  }

  @Get('payouts')
  @ApiOperation({ summary: '[SELLER] List payout history and pending withdrawal requests' })
  async getPayouts(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.billingService.getSellerPayouts(user.id, query);
  }

  @Post('payouts')
  @ApiOperation({ summary: '[SELLER] Request a payout from available storefront balance' })
  async requestPayout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GatewayRequestPayoutDto,
  ) {
    return this.billingService.requestSellerPayout(user.id, dto);
  }
}

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly billingService: BillingGatewayService) {}

  @Get('summary')
  @ApiOperation({ summary: '[ADMIN] Get platform-wide GMV, commission earnings, and payout stats' })
  async getPlatformSummary() {
    return this.billingService.getPlatformSummary();
  }

  @Get('invoices')
  @ApiOperation({ summary: '[ADMIN] List invoices across all stores' })
  async getInvoices(@Query() query: any) {
    return this.billingService.getAdminInvoices(query);
  }

  @Get('payouts')
  @ApiOperation({ summary: '[ADMIN] List seller payout requests across platform' })
  async getPayouts(@Query() query: any) {
    return this.billingService.getAdminPayouts(query);
  }

  @Patch('payouts/:id/pay')
  @ApiOperation({ summary: '[ADMIN] Mark a seller payout request as PAID' })
  async markPayoutPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stripeTransferId') stripeTransferId?: string,
  ) {
    return this.billingService.markPayoutPaid(id, stripeTransferId);
  }
}
