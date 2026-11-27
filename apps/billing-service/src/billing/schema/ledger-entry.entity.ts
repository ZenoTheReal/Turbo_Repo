import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LedgerEntryType } from '@repo/common';

@Entity('ledger_entries')
@Index('idx_ledger_store_created', ['storeId', 'createdAt'])
@Index('idx_ledger_order', ['orderId'])
@Index('idx_ledger_payout', ['payoutId'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  payoutId?: string | null;

  @Column({ type: 'varchar', length: 30 })
  type: LedgerEntryType;

  /**
   * Signed ledger amount: positive for ORDER_CREDIT, negative for PLATFORM_FEE, PAYOUT, and REFUND_DEBIT.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
