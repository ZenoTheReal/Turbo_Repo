import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { InvoiceStatus } from '@repo/common';

@Entity('invoices')
@Index('idx_invoices_store_status', ['storeId', 'status'])
@Index('idx_invoices_order', ['orderId'], { unique: true })
@Index('idx_invoices_number', ['invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'uuid', nullable: true })
  buyerId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  buyerEmail: string;

  @Column({ type: 'varchar', length: 255 })
  buyerName: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  commissionRateSnapshot: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  fixedFeeSnapshot: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  platformFeeAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  sellerNetAmount: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: InvoiceStatus.PAID,
  })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId?: string | null;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
