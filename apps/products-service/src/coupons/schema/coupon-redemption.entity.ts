import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('coupon_redemptions')
@Index('idx_redemptions_coupon_user', ['couponId', 'userId'])
@Index('idx_redemptions_store_user', ['storeId', 'userId'])
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  couponId: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @CreateDateColumn()
  redeemedAt: Date;
}
