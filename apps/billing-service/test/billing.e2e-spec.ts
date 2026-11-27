import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { DatabaseModule } from '../src/config/database/database.module.js';
import { Database } from '../src/config/database/database.js';
import { BillingModule } from '../src/billing/billing.module.js';
import { BillingService } from '../src/billing/billing.service.js';
import { Invoice } from '../src/billing/schema/invoice.entity.js';
import { LedgerEntry } from '../src/billing/schema/ledger-entry.entity.js';
import { SellerPayout } from '../src/billing/schema/seller-payout.entity.js';
import { InvoiceStatus, LedgerEntryType, PayoutStatus } from '@repo/common';

describe('Billing Service E2E Commission & Ledger Suite', () => {
  let moduleRef: TestingModule;
  let database: Database;
  let billingService: BillingService;

  const testStoreId = randomUUID();
  const testOrderId = randomUUID();
  const testBuyerId = randomUUID();
  let createdInvoiceId: string;
  let createdPayoutId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', 'apps/billing-service/.env'],
        }),
        DatabaseModule,
        BillingModule,
      ],
    }).compile();

    database = moduleRef.get(Database);
    billingService = moduleRef.get(BillingService);

    await database.onModuleInit();
  }, 30000);

  afterAll(async () => {
    if (database?.dataSource?.isInitialized) {
      await database.dataSource.getRepository(LedgerEntry).delete({ storeId: testStoreId });
      await database.dataSource.getRepository(SellerPayout).delete({ storeId: testStoreId });
      await database.dataSource.getRepository(Invoice).delete({ storeId: testStoreId });
      await database.onModuleDestroy();
    }
  });

  it('1. Records order payment, snapshots fees, issues invoice, and posts credit/fee ledger entries', async () => {
    const invoice = await billingService.recordOrderPayment({
      orderId: testOrderId,
      orderNumber: `ORD-TEST-${Date.now()}`,
      storeId: testStoreId,
      buyerId: testBuyerId,
      buyerEmail: 'buyer-billing-e2e@example.com',
      buyerName: 'Billing Tester',
      currency: 'usd',
      subtotal: 200,
      totalAmount: 200,
      commissionRate: 5, // 5% of 200 = 10.00
      fixedFee: 0.5, // + 0.50 = 10.50 total fee
      stripePaymentIntentId: 'pi_test_123',
    });

    createdInvoiceId = invoice.id;
    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(Number(invoice.grossAmount)).toBe(200);
    expect(Number(invoice.platformFeeAmount)).toBe(10.5);
    expect(Number(invoice.sellerNetAmount)).toBe(189.5);
    expect(invoice.status).toBe(InvoiceStatus.PAID);

    const ledger = await billingService.findStoreLedger(testStoreId, { page: 1, limit: 10 });
    expect(ledger.data.length).toBe(2);
    const credit = ledger.data.find((e) => e.type === LedgerEntryType.ORDER_CREDIT);
    const fee = ledger.data.find((e) => e.type === LedgerEntryType.PLATFORM_FEE);
    expect(Number(credit?.amount)).toBe(200);
    expect(Number(fee?.amount)).toBe(-10.5);
  });

  it('2. Enforces idempotency when recording the same paid orderId twice', async () => {
    const duplicate = await billingService.recordOrderPayment({
      orderId: testOrderId,
      orderNumber: 'ORD-DUP',
      storeId: testStoreId,
      buyerEmail: 'buyer-billing-e2e@example.com',
      totalAmount: 200,
      commissionRate: 5,
      fixedFee: 0.5,
    });

    expect(duplicate.id).toBe(createdInvoiceId);
    const ledger = await billingService.findStoreLedger(testStoreId, { page: 1, limit: 10 });
    expect(ledger.data.length).toBe(2);
  });

  it('3. Computes exact store summary and available balance', async () => {
    const summary = await billingService.getStoreSummary(testStoreId);
    expect(summary.totalGrossRevenue).toBe(200);
    expect(summary.totalPlatformFees).toBe(10.5);
    expect(summary.totalNetEarnings).toBe(189.5);
    expect(summary.availableBalance).toBe(189.5);
    expect(summary.paidInvoiceCount).toBe(1);
  });

  it('4. Rejects payout request exceeding available balance', async () => {
    await expect(
      billingService.requestPayout({
        storeId: testStoreId,
        amount: 250,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('5. Processes valid payout request, debits ledger balance, and marks payout PAID', async () => {
    const payout = await billingService.requestPayout({
      storeId: testStoreId,
      amount: 100,
      currency: 'USD',
      notes: 'Weekly settlement',
    });

    createdPayoutId = payout.id;
    expect(payout.payoutReference).toMatch(/^PAY-/);
    expect(payout.status).toBe(PayoutStatus.PENDING);

    const summaryAfterRequest = await billingService.getStoreSummary(testStoreId);
    expect(summaryAfterRequest.availableBalance).toBe(89.5);
    expect(summaryAfterRequest.pendingPayouts).toBe(100);

    const paidPayout = await billingService.markPayoutPaid(createdPayoutId, 'tr_test_123');
    expect(paidPayout.status).toBe(PayoutStatus.PAID);
    expect(paidPayout.paidAt).toBeTruthy();

    const summaryAfterPaid = await billingService.getStoreSummary(testStoreId);
    expect(summaryAfterPaid.totalPaidOut).toBe(100);
    expect(summaryAfterPaid.pendingPayouts).toBe(0);
  });

  it('6. Records refund on invoice and debits seller net amount cleanly', async () => {
    const refundOrderId = randomUUID();
    await billingService.recordOrderPayment({
      orderId: refundOrderId,
      orderNumber: `ORD-REFUND-${Date.now()}`,
      storeId: testStoreId,
      buyerEmail: 'refund@example.com',
      totalAmount: 50,
      commissionRate: 10, // fee = 5, net = 45
      fixedFee: 0,
    });

    const summaryBeforeRefund = await billingService.getStoreSummary(testStoreId);
    expect(summaryBeforeRefund.availableBalance).toBe(134.5); // 89.5 + 45

    const refunded = await billingService.recordOrderRefund(refundOrderId, 'Customer returned item');
    expect(refunded?.status).toBe(InvoiceStatus.REFUNDED);

    const summaryAfterRefund = await billingService.getStoreSummary(testStoreId);
    expect(summaryAfterRefund.availableBalance).toBe(89.5); // 134.5 - 45
  });
});
