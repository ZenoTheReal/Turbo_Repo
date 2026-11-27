import {
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES, BILLING_PATTERNS } from '@repo/common';
import { StoresService } from '../stores/stores.service.js';
import { GatewayRequestPayoutDto } from './dto/request-payout.dto.js';

@Injectable()
export class BillingGatewayService {
  constructor(
    @Inject(SERVICES.BILLING) private readonly billingClient: ClientProxy,
    private readonly storesService: StoresService,
  ) {}

  private async getSellerStore(sellerId: string) {
    const store = await this.storesService.findByOwnerId(sellerId);
    if (!store) {
      throw new ForbiddenException('You do not have an active storefront.');
    }
    return store;
  }

  async getSellerSummary(sellerId: string) {
    const store = await this.getSellerStore(sellerId);
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.GET_STORE_SUMMARY, { storeId: store.id }),
    );
  }

  async getSellerInvoices(sellerId: string, query: any) {
    const store = await this.getSellerStore(sellerId);
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.FIND_INVOICES, {
        ...query,
        storeId: store.id,
      }),
    );
  }

  async getSellerLedger(sellerId: string, query: any) {
    const store = await this.getSellerStore(sellerId);
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.FIND_STORE_LEDGER, {
        storeId: store.id,
        query,
      }),
    );
  }

  async getSellerPayouts(sellerId: string, query: any) {
    const store = await this.getSellerStore(sellerId);
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.FIND_PAYOUTS, {
        ...query,
        storeId: store.id,
      }),
    );
  }

  async requestSellerPayout(sellerId: string, dto: GatewayRequestPayoutDto) {
    const store = await this.getSellerStore(sellerId);
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.REQUEST_PAYOUT, {
        storeId: store.id,
        amount: dto.amount,
        notes: dto.notes,
        requestedByUserId: sellerId,
      }),
    );
  }

  async getPlatformSummary() {
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.GET_PLATFORM_SUMMARY, {}),
    );
  }

  async getAdminInvoices(query: any) {
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.FIND_INVOICES, query || {}),
    );
  }

  async getAdminPayouts(query: any) {
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.FIND_PAYOUTS, query || {}),
    );
  }

  async markPayoutPaid(payoutId: string, stripeTransferId?: string) {
    return firstValueFrom(
      this.billingClient.send(BILLING_PATTERNS.MARK_PAYOUT_PAID, {
        payoutId,
        stripeTransferId,
      }),
    );
  }
}
