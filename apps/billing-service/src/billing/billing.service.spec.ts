import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, LedgerEntryType, PayoutStatus } from '@repo/common';
import { BillingService } from './billing.service.js';
import { Invoice } from './schema/invoice.entity.js';
import { LedgerEntry } from './schema/ledger-entry.entity.js';
import { SellerPayout } from './schema/seller-payout.entity.js';

describe('BillingService Unit Suite', () => {
  let service: BillingService;
  let mockInvoiceRepo: any;
  let mockLedgerRepo: any;
  let mockPayoutRepo: any;
  let mockManager: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockInvoiceRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    mockLedgerRepo = {
      createQueryBuilder: vi.fn(),
    };
    mockPayoutRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockManager = {
      query: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((_, data) => ({ ...data })),
      save: vi.fn(async (entityClass, obj) => ({
        id: obj.id || `${entityClass.name.toLowerCase()}-uuid`,
        ...obj,
      })),
      createQueryBuilder: vi.fn(),
    };

    mockDataSource = {
      getRepository: vi.fn((entity) => {
        if (entity === Invoice) return mockInvoiceRepo;
        if (entity === LedgerEntry) return mockLedgerRepo;
        if (entity === SellerPayout) return mockPayoutRepo;
        return {};
      }),
      transaction: vi.fn(async (cb) => cb(mockManager)),
    };

    service = new BillingService({ dataSource: mockDataSource } as any);
  });

  it('computes percentage + fixed commission and posts credit & fee ledger entries atomically', async () => {
    mockManager.findOne.mockResolvedValue(null);

    const invoice = await service.recordOrderPayment({
      orderId: '11111111-1111-1111-1111-111111111111',
      orderNumber: 'ORD-100',
      storeId: '22222222-2222-2222-2222-222222222222',
      buyerEmail: 'buyer@example.com',
      totalAmount: 100,
      commissionRate: 5,
      fixedFee: 0.3,
    });

    expect(Number(invoice.platformFeeAmount)).toBe(5.3);
    expect(Number(invoice.sellerNetAmount)).toBe(94.7);
    expect(invoice.status).toBe(InvoiceStatus.PAID);
    expect(mockManager.save).toHaveBeenCalledTimes(3);

    const secondCallPayload = mockManager.save.mock.calls[1][1];
    const thirdCallPayload = mockManager.save.mock.calls[2][1];
    expect(secondCallPayload.type).toBe(LedgerEntryType.ORDER_CREDIT);
    expect(secondCallPayload.amount).toBe(100);
    expect(thirdCallPayload.type).toBe(LedgerEntryType.PLATFORM_FEE);
    expect(thirdCallPayload.amount).toBe(-5.3);
  });

  it('returns existing invoice idempotently without duplicating ledger entries', async () => {
    const existing = { id: 'inv-existing', invoiceNumber: 'INV-1' };
    mockManager.findOne.mockResolvedValue(existing);

    const res = await service.recordOrderPayment({
      orderId: '11111111-1111-1111-1111-111111111111',
      orderNumber: 'ORD-100',
      storeId: '22222222-2222-2222-2222-222222222222',
      buyerEmail: 'buyer@example.com',
      totalAmount: 100,
    });

    expect(res).toBe(existing);
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('rejects payout request when requested amount exceeds available ledger balance', async () => {
    mockManager.createQueryBuilder.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ availableBalance: '50.00' }),
    });

    await expect(
      service.requestPayout({
        storeId: '22222222-2222-2222-2222-222222222222',
        amount: 75,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates payout and debits ledger when sufficient balance exists', async () => {
    mockManager.createQueryBuilder.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ availableBalance: '120.00' }),
    });

    const payout = await service.requestPayout({
      storeId: '22222222-2222-2222-2222-222222222222',
      amount: 100,
    });

    expect(payout.status).toBe(PayoutStatus.PENDING);
    expect(mockManager.save).toHaveBeenCalledTimes(2);
    expect(mockManager.save.mock.calls[1][1].type).toBe(LedgerEntryType.PAYOUT);
    expect(mockManager.save.mock.calls[1][1].amount).toBe(-100);
  });

  it('throws NotFoundException when marking missing payout as paid', async () => {
    mockPayoutRepo.findOne.mockResolvedValue(null);
    await expect(service.markPayoutPaid('missing-id')).rejects.toThrow(NotFoundException);
  });
});
