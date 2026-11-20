import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DiscountType, CouponScope } from '@repo/common';

@Entity('coupons')
@Index('idx_coupons_store_code', ['storeId', 'code'], { unique: true })
@Index('idx_coupons_store_active', ['storeId', 'isActive'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: DiscountType.PERCENTAGE,
  })
  discountType: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: CouponScope.ALL_PRODUCTS,
  })
  appliesTo: CouponScope;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  applicableCategoryIds?: string[] | null;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  applicableProductIds?: string[] | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  minOrderAmount: number;

  @Column({ type: 'int', nullable: true })
  usageLimit?: number | null;

  @Column({ type: 'int', default: 1 })
  usageLimitPerCustomer: number;

  @Column({ type: 'int', default: 0 })
  timesUsed: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
