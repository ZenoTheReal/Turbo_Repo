import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@repo/common';
import { StoresService } from './stores.service.js';
import { StripeService } from '../config/stripe/stripe.service.js';
import { ApplyStoreDto } from './dto/apply-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { CheckSubdomainDto } from './dto/check-subdomain.dto.js';
import { FindStoresQueryDto } from './dto/find-stores-query.dto.js';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

@ApiTags('Stores')
@Controller()
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly stripeService: StripeService,
  ) {}

  // 1. Live Subdomain Availability Check (Public)
  @Get('stores/check-subdomain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if a requested subdomain is available, valid, and not reserved' })
  @ApiQuery({ name: 'subdomain', required: true, example: 'nike' })
  @ApiResponse({ status: 200, description: 'Subdomain availability result' })
  async checkSubdomain(@Query() query: CheckSubdomainDto) {
    return this.storesService.checkSubdomainAvailability(query.subdomain);
  }

  // 2. Seller Applies for a Storefront (Requires SELLER role)
  @Post('stores/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Submit storefront application with requested subdomain' })
  @ApiResponse({ status: 201, description: 'Store application created in PENDING_APPROVAL status' })
  async applyStore(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ApplyStoreDto,
  ) {
    const store = await this.storesService.applyStore(user.id, dto);
    return {
      message: 'Storefront application submitted successfully and is pending administrator review.',
      store,
    };
  }

  // 3. Seller Views Own Storefront Status (Requires SELLER role)
  @Get('stores/my-store')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Get own storefront status and details' })
  @ApiResponse({ status: 200, description: 'Storefront profile retrieved' })
  async getMyStore(@CurrentUser() user: CurrentUserPayload) {
    const store = await this.storesService.findByOwnerId(user.id);
    return {
      hasStore: Boolean(store),
      store,
    };
  }

  // 4. Seller Updates Storefront Profile, Theme, and Policies
  @Patch('stores/my-store')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Update storefront profile, theme settings, branding, and policies' })
  @ApiResponse({ status: 200, description: 'Storefront updated successfully' })
  async updateMyStore(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateStoreDto,
  ) {
    const store = await this.storesService.findByOwnerId(user.id);
    if (!store) {
      throw new NotFoundException('You do not have a registered storefront.');
    }
    const updatedStore = await this.storesService.updateStore(store.id, user.id, dto);
    return {
      message: 'Storefront profile updated successfully.',
      store: updatedStore,
    };
  }

  // 5. Seller Initiates Stripe Connect Onboarding (Activates Store Payouts)
  @Post('stores/my-store/stripe/connect')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Generate Stripe Connect hosted onboarding link to activate store payouts' })
  @ApiResponse({ status: 200, description: 'Stripe onboarding URL generated' })
  async connectStripe(
    @CurrentUser() user: CurrentUserPayload,
    @Query('returnUrl') returnUrl?: string,
    @Query('refreshUrl') refreshUrl?: string,
  ) {
    const store = await this.storesService.findByOwnerId(user.id);
    if (!store) {
      throw new NotFoundException('You do not have a registered storefront.');
    }

    const onboardingUrl = await this.stripeService.createConnectOnboardingLink(
      store,
      returnUrl,
      refreshUrl,
    );

    return {
      message: 'Stripe onboarding URL generated successfully.',
      onboardingUrl,
    };
  }

  // 6. Seller Accesses Stripe Express Dashboard
  @Get('stores/my-store/stripe/dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Access Stripe Express dashboard for bank accounts and payouts' })
  @ApiResponse({ status: 200, description: 'Stripe Express dashboard login URL generated' })
  async getStripeDashboard(@CurrentUser() user: CurrentUserPayload) {
    const store = await this.storesService.findByOwnerId(user.id);
    if (!store || !store.stripeAccountId) {
      throw new BadRequestException('Store has not connected a Stripe account yet.');
    }

    const dashboardUrl = await this.stripeService.createExpressDashboardLink(store.stripeAccountId);
    return { dashboardUrl };
  }

  // 7. Seller Checks Stripe Connect Payout Status
  @Get('stores/my-store/stripe/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: '[SELLER] Get current Stripe Connect payout status' })
  @ApiResponse({ status: 200, description: 'Stripe Connect status retrieved' })
  async getStripeStatus(@CurrentUser() user: CurrentUserPayload) {
    const store = await this.storesService.findByOwnerId(user.id);
    if (!store) {
      throw new NotFoundException('You do not have a registered storefront.');
    }

    return {
      stripeAccountId: store.stripeAccountId ?? null,
      isPayoutsEnabled: store.isPayoutsEnabled,
      hasConnectedStripe: Boolean(store.stripeAccountId),
      currency: store.currency,
      status: store.isPayoutsEnabled
        ? 'READY'
        : store.stripeAccountId
          ? 'VERIFICATION_PENDING'
          : 'NOT_CONNECTED',
    };
  }

  // 8. Public Storefront Resolution for Next.js (web-fe)
  @Get('storefronts/:subdomain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch active storefront branding and configuration by subdomain' })
  @ApiResponse({ status: 200, description: 'Active storefront details retrieved' })
  @ApiResponse({ status: 404, description: 'Storefront not found or not active' })
  async getStorefront(@Param('subdomain') subdomain: string) {
    return this.storesService.getStorefrontBySubdomain(subdomain);
  }

  // ========================================================
  // ADMIN STORE MANAGEMENT
  // ========================================================

  // 5. Admin: List Stores (Filterable by status e.g. PENDING_APPROVAL, Searchable, Sortable)
  @Get('admin/stores')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] List stores with search, sort, and status filter (e.g. status=PENDING_APPROVAL for review queue)',
  })
  @ApiResponse({ status: 200, description: 'Paginated stores list' })
  async getAllStores(@Query() query: FindStoresQueryDto) {
    return this.storesService.findStores(query);
  }

  // 6. Admin: Get Single Store Details
  @Get('admin/stores/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Get complete store details by ID' })
  @ApiResponse({ status: 200, description: 'Store details retrieved' })
  async getStoreById(@Param('id', ParseUUIDPipe) id: string) {
    return this.storesService.findById(id);
  }

  // 7. Admin: Update Store Status (ACTIVE = approve & provision, REJECTED = decline, SUSPENDED = deactivate)
  @Patch('admin/stores/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Update store status (ACTIVE = approve & provision on the fly, REJECTED = decline, SUSPENDED = deactivate)',
  })
  @ApiResponse({ status: 200, description: 'Store status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() adminUser: CurrentUserPayload,
    @Body() dto: UpdateStoreStatusDto,
  ) {
    const store = await this.storesService.updateStoreStatus(
      id,
      dto.status,
      adminUser.id,
      dto.reason,
    );
    return {
      message: `Storefront status updated to "${store.status}" successfully.`,
      store,
    };
  }
}
