import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PayoutStatus } from '@repo/common';

@Entity('seller_payouts')
@Index('idx_payouts_store_status', ['storeId', 'status'])
@Index('idx_payouts_ref', ['payoutReference'], { unique: true })
export class SellerPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  payoutReference: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeTransferId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  requestedByUserId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
