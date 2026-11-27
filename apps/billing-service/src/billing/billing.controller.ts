import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { BILLING_PATTERNS, ORDER_EVENTS } from '@repo/common';
import { BillingService } from './billing.service.js';
import { RecordOrderPaymentDto } from './dto/record-order-payment.dto.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { QueryBillingDto } from './dto/query-billing.dto.js';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @EventPattern(ORDER_EVENTS.PAID)
  async handleOrderPaid(@Payload() payload: RecordOrderPaymentDto) {
    if (!payload?.orderId) return;
    await this.billingService.recordOrderPayment(payload);
  }

  @EventPattern(ORDER_EVENTS.CANCELLED)
  async handleOrderCancelled(@Payload() payload: { orderId: string; reason?: string }) {
    if (!payload?.orderId) return;
    await this.billingService.recordOrderRefund(payload.orderId, payload.reason);
  }

  @MessagePattern(BILLING_PATTERNS.RECORD_ORDER_PAYMENT)
  async recordOrderPayment(@Payload() dto: RecordOrderPaymentDto) {
    return this.billingService.recordOrderPayment(dto);
  }

  @MessagePattern(BILLING_PATTERNS.RECORD_ORDER_REFUND)
  async recordOrderRefund(@Payload() data: { orderId: string; reason?: string }) {
    return this.billingService.recordOrderRefund(data.orderId, data.reason);
  }

  @MessagePattern(BILLING_PATTERNS.FIND_INVOICES)
  async findInvoices(@Payload() query: QueryBillingDto) {
    return this.billingService.findInvoices(query || {});
  }

  @MessagePattern(BILLING_PATTERNS.FIND_INVOICE_BY_ORDER)
  async findInvoiceByOrder(@Payload() data: { orderId: string; storeId?: string }) {
    return this.billingService.findInvoiceByOrder(data.orderId, data.storeId);
  }

  @MessagePattern(BILLING_PATTERNS.FIND_STORE_LEDGER)
  async findStoreLedger(@Payload() data: { storeId: string; query: QueryBillingDto }) {
    return this.billingService.findStoreLedger(data.storeId, data.query || {});
  }

  @MessagePattern(BILLING_PATTERNS.GET_STORE_SUMMARY)
  async getStoreSummary(@Payload() data: { storeId: string }) {
    return this.billingService.getStoreSummary(data.storeId);
  }

  @MessagePattern(BILLING_PATTERNS.GET_PLATFORM_SUMMARY)
  async getPlatformSummary() {
    return this.billingService.getPlatformSummary();
  }

  @MessagePattern(BILLING_PATTERNS.REQUEST_PAYOUT)
  async requestPayout(@Payload() dto: RequestPayoutDto) {
    return this.billingService.requestPayout(dto);
  }

  @MessagePattern(BILLING_PATTERNS.FIND_PAYOUTS)
  async findPayouts(@Payload() query: QueryBillingDto) {
    return this.billingService.findPayouts(query || {});
  }

  @MessagePattern(BILLING_PATTERNS.MARK_PAYOUT_PAID)
  async markPayoutPaid(@Payload() data: { payoutId: string; stripeTransferId?: string }) {
    return this.billingService.markPayoutPaid(data.payoutId, data.stripeTransferId);
  }
}
