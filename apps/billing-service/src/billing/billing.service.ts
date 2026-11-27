import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  InvoiceStatus,
  LedgerEntryType,
  PayoutStatus,
} from '@repo/common';
import { Database } from '../config/database/database.js';
import { Invoice } from './schema/invoice.entity.js';
import { LedgerEntry } from './schema/ledger-entry.entity.js';
import { SellerPayout } from './schema/seller-payout.entity.js';
import { RecordOrderPaymentDto } from './dto/record-order-payment.dto.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { QueryBillingDto } from './dto/query-billing.dto.js';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly invoiceRepository: Repository<Invoice>;
  private readonly ledgerRepository: Repository<LedgerEntry>;
  private readonly payoutRepository: Repository<SellerPayout>;

  constructor(private readonly database: Database) {
    this.invoiceRepository = this.database.dataSource.getRepository(Invoice);
    this.ledgerRepository = this.database.dataSource.getRepository(LedgerEntry);
    this.payoutRepository = this.database.dataSource.getRepository(SellerPayout);
  }

  private roundCurrency(value: number | string | null | undefined): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private generateReference(prefix: string): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${dateStr}-${randomHex}`;
  }

  async recordOrderPayment(dto: RecordOrderPaymentDto): Promise<Invoice> {
    const grossAmount = this.roundCurrency(dto.totalAmount);
    const commissionRate = this.roundCurrency(dto.commissionRate ?? 0);
    const fixedFee = this.roundCurrency(dto.fixedFee ?? 0);
    const calculatedFee = this.roundCurrency((grossAmount * commissionRate) / 100 + fixedFee);
    const platformFeeAmount = Math.min(grossAmount, Math.max(0, calculatedFee));
    const sellerNetAmount = this.roundCurrency(grossAmount - platformFeeAmount);
    const currency = (dto.currency || 'USD').toUpperCase();

    return this.database.dataSource.transaction(async (manager) => {
      // Serialize concurrent invoice generation for the same orderId
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [dto.orderId]);

      const existing = await manager.findOne(Invoice, {
        where: { orderId: dto.orderId },
      });
      if (existing) {
        return existing;
      }

      const invoice = manager.create(Invoice, {
        invoiceNumber: this.generateReference('INV'),
        orderId: dto.orderId,
        orderNumber: dto.orderNumber,
        storeId: dto.storeId,
        buyerId: dto.buyerId ?? null,
        buyerEmail: dto.buyerEmail,
        buyerName: dto.buyerName || dto.buyerEmail.split('@')[0] || 'Customer',
        currency,
        subtotal: this.roundCurrency(dto.subtotal ?? grossAmount),
        discountAmount: this.roundCurrency(dto.discountAmount ?? 0),
        shippingAmount: this.roundCurrency(dto.shippingAmount ?? 0),
        taxAmount: this.roundCurrency(dto.taxAmount ?? 0),
        grossAmount,
        commissionRateSnapshot: commissionRate,
        fixedFeeSnapshot: fixedFee,
        platformFeeAmount,
        sellerNetAmount,
        status: InvoiceStatus.PAID,
        stripePaymentIntentId: dto.stripePaymentIntentId ?? null,
        issuedAt: new Date(),
      });

      const savedInvoice = await manager.save(Invoice, invoice);

      const creditEntry = manager.create(LedgerEntry, {
        storeId: dto.storeId,
        orderId: dto.orderId,
        invoiceId: savedInvoice.id,
        type: LedgerEntryType.ORDER_CREDIT,
        amount: grossAmount,
        currency,
        description: `Order ${dto.orderNumber} payment received (${savedInvoice.invoiceNumber})`,
      });
      await manager.save(LedgerEntry, creditEntry);

      if (platformFeeAmount > 0) {
        const feeEntry = manager.create(LedgerEntry, {
          storeId: dto.storeId,
          orderId: dto.orderId,
          invoiceId: savedInvoice.id,
          type: LedgerEntryType.PLATFORM_FEE,
          amount: -platformFeeAmount,
          currency,
          description: `Platform fee for ${dto.orderNumber} (${commissionRate}% + ${fixedFee.toFixed(2)})`,
        });
        await manager.save(LedgerEntry, feeEntry);
      }

      this.logger.log(
        `Issued invoice ${savedInvoice.invoiceNumber} for order ${dto.orderNumber} (Gross: ${grossAmount}, Fee: ${platformFeeAmount}, Net: ${sellerNetAmount})`,
      );

      return savedInvoice;
    });
  }

  async recordOrderRefund(orderId: string, reason?: string): Promise<Invoice | null> {
    return this.database.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [orderId]);

      const invoice = await manager.findOne(Invoice, {
        where: { orderId },
      });

      if (!invoice || invoice.status === InvoiceStatus.REFUNDED) {
        return invoice ?? null;
      }

      invoice.status = InvoiceStatus.REFUNDED;
      const updatedInvoice = await manager.save(Invoice, invoice);

      const debitAmount = this.roundCurrency(invoice.sellerNetAmount);
      if (debitAmount > 0) {
        const refundEntry = manager.create(LedgerEntry, {
          storeId: invoice.storeId,
          orderId: invoice.orderId,
          invoiceId: invoice.id,
          type: LedgerEntryType.REFUND_DEBIT,
          amount: -debitAmount,
          currency: invoice.currency,
          description: reason || `Refund debit for order ${invoice.orderNumber}`,
        });
        await manager.save(LedgerEntry, refundEntry);
      }

      this.logger.log(`Recorded refund on invoice ${invoice.invoiceNumber} for order ${invoice.orderNumber}`);
      return updatedInvoice;
    });
  }

  async findInvoiceByOrder(orderId: string, storeId?: string): Promise<Invoice> {
    const where: any = { orderId };
    if (storeId) {
      where.storeId = storeId;
    }

    const invoice = await this.invoiceRepository.findOne({ where });
    if (!invoice) {
      throw new NotFoundException(`Invoice for order "${orderId}" was not found.`);
    }
    return invoice;
  }

  async findInvoices(query: QueryBillingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .orderBy('invoice.issuedAt', 'DESC');

    if (query.storeId) {
      qb.andWhere('invoice.storeId = :storeId', { storeId: query.storeId });
    }
    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.orderNumber ILIKE :search OR invoice.buyerEmail ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findStoreLedger(storeId: string, query: QueryBillingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.ledgerRepository
      .createQueryBuilder('entry')
      .where('entry.storeId = :storeId', { storeId })
      .orderBy('entry.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('entry.type = :type', { type: query.status });
    }

    qb.skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async getStoreSummary(storeId: string) {
    const invoiceStats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.grossAmount), 0)', 'totalGrossRevenue')
      .addSelect('COALESCE(SUM(invoice.platformFeeAmount), 0)', 'totalPlatformFees')
      .addSelect('COALESCE(SUM(invoice.sellerNetAmount), 0)', 'totalNetEarnings')
      .addSelect('COUNT(invoice.id)', 'paidInvoiceCount')
      .where('invoice.storeId = :storeId', { storeId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .getRawOne();

    const balanceRow = await this.ledgerRepository
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amount), 0)', 'availableBalance')
      .where('entry.storeId = :storeId', { storeId })
      .getRawOne();

    const payoutRows = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('payout.status', 'status')
      .addSelect('COALESCE(SUM(payout.amount), 0)', 'total')
      .where('payout.storeId = :storeId', { storeId })
      .groupBy('payout.status')
      .getRawMany();

    let totalPaidOut = 0;
    let pendingPayouts = 0;
    for (const row of payoutRows) {
      if (row.status === PayoutStatus.PAID) {
        totalPaidOut = this.roundCurrency(row.total);
      } else if (row.status === PayoutStatus.PENDING || row.status === PayoutStatus.SCHEDULED) {
        pendingPayouts = this.roundCurrency(pendingPayouts + Number(row.total));
      }
    }

    return {
      storeId,
      totalGrossRevenue: this.roundCurrency(invoiceStats?.totalGrossRevenue),
      totalPlatformFees: this.roundCurrency(invoiceStats?.totalPlatformFees),
      totalNetEarnings: this.roundCurrency(invoiceStats?.totalNetEarnings),
      availableBalance: this.roundCurrency(balanceRow?.availableBalance),
      totalPaidOut,
      pendingPayouts,
      paidInvoiceCount: Number(invoiceStats?.paidInvoiceCount || 0),
    };
  }

  async getPlatformSummary() {
    const invoiceStats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.grossAmount), 0)', 'totalGmv')
      .addSelect('COALESCE(SUM(invoice.platformFeeAmount), 0)', 'totalCommissionEarned')
      .addSelect('COALESCE(SUM(invoice.sellerNetAmount), 0)', 'totalSellerNet')
      .addSelect('COUNT(invoice.id)', 'paidInvoiceCount')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .getRawOne();

    const payoutStats = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('payout.status', 'status')
      .addSelect('COALESCE(SUM(payout.amount), 0)', 'total')
      .addSelect('COUNT(payout.id)', 'count')
      .groupBy('payout.status')
      .getRawMany();

    let pendingPayoutAmount = 0;
    let pendingPayoutCount = 0;
    let completedPayoutAmount = 0;

    for (const row of payoutStats) {
      if (row.status === PayoutStatus.PENDING || row.status === PayoutStatus.SCHEDULED) {
        pendingPayoutAmount = this.roundCurrency(pendingPayoutAmount + Number(row.total));
        pendingPayoutCount += Number(row.count || 0);
      } else if (row.status === PayoutStatus.PAID) {
        completedPayoutAmount = this.roundCurrency(row.total);
      }
    }

    return {
      totalGmv: this.roundCurrency(invoiceStats?.totalGmv),
      totalCommissionEarned: this.roundCurrency(invoiceStats?.totalCommissionEarned),
      totalSellerNet: this.roundCurrency(invoiceStats?.totalSellerNet),
      paidInvoiceCount: Number(invoiceStats?.paidInvoiceCount || 0),
      pendingPayoutAmount,
      pendingPayoutCount,
      completedPayoutAmount,
    };
  }

  async requestPayout(dto: RequestPayoutDto): Promise<SellerPayout> {
    const requestedAmount = this.roundCurrency(dto.amount);
    if (requestedAmount <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero.');
    }

    return this.database.dataSource.transaction(async (manager) => {
      // Prevent concurrent payout requests for the same store from overdrafting ledger balance
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [dto.storeId]);

      const balanceRow = await manager
        .createQueryBuilder(LedgerEntry, 'entry')
        .select('COALESCE(SUM(entry.amount), 0)', 'availableBalance')
        .where('entry.storeId = :storeId', { storeId: dto.storeId })
        .getRawOne();

      const availableBalance = this.roundCurrency(balanceRow?.availableBalance);
      if (requestedAmount > availableBalance) {
        throw new BadRequestException(
          `Insufficient available balance (${availableBalance.toFixed(2)}) for payout of ${requestedAmount.toFixed(2)}.`,
        );
      }

      const currency = (dto.currency || 'USD').toUpperCase();
      const payout = manager.create(SellerPayout, {
        payoutReference: this.generateReference('PAY'),
        storeId: dto.storeId,
        amount: requestedAmount,
        currency,
        status: PayoutStatus.PENDING,
        requestedByUserId: dto.requestedByUserId ?? null,
        notes: dto.notes ?? null,
      });
      const savedPayout = await manager.save(SellerPayout, payout);

      const ledgerDebit = manager.create(LedgerEntry, {
        storeId: dto.storeId,
        payoutId: savedPayout.id,
        type: LedgerEntryType.PAYOUT,
        amount: -requestedAmount,
        currency,
        description: `Seller payout request ${savedPayout.payoutReference}`,
      });
      await manager.save(LedgerEntry, ledgerDebit);

      this.logger.log(
        `Created payout request ${savedPayout.payoutReference} for store ${dto.storeId} (${requestedAmount} ${currency})`,
      );

      return savedPayout;
    });
  }

  async findPayouts(query: QueryBillingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepository
      .createQueryBuilder('payout')
      .orderBy('payout.createdAt', 'DESC');

    if (query.storeId) {
      qb.andWhere('payout.storeId = :storeId', { storeId: query.storeId });
    }
    if (query.status) {
      qb.andWhere('payout.status = :status', { status: query.status });
    }

    qb.skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async markPayoutPaid(payoutId: string, stripeTransferId?: string): Promise<SellerPayout> {
    const payout = await this.payoutRepository.findOne({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException(`Payout with ID "${payoutId}" was not found.`);
    }

    if (payout.status === PayoutStatus.PAID) {
      return payout;
    }

    payout.status = PayoutStatus.PAID;
    payout.paidAt = new Date();
    if (stripeTransferId) {
      payout.stripeTransferId = stripeTransferId;
    }

    const updated = await this.payoutRepository.save(payout);
    this.logger.log(`Marked payout ${updated.payoutReference} as PAID`);
    return updated;
  }
}
