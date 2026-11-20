import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderStatus, PaymentStatus } from '@repo/common';
import { OrderItem } from './order-item.entity.js';

@Entity('store_orders')
@Index('idx_orders_store_status', ['storeId', 'status'])
@Index('idx_orders_buyer', ['buyerId'])
@Index('idx_orders_number', ['orderNumber'], { unique: true })
@Index('idx_orders_pending_expires', ['status', 'expiresAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'uuid', nullable: true })
  buyerId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  buyerEmail: string;

  @Column({ type: 'varchar', length: 255 })
  buyerName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  buyerPhone?: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({
    type: 'varchar',
    length: 30,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSessionId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
