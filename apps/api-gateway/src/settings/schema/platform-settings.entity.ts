import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('platform_settings')
export class PlatformSettings {
  @ApiProperty({ example: 1, description: 'Singleton identifier for platform settings' })
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  // Platform Identity & Branding
  @ApiProperty({ example: 'OmniStore', description: 'Platform display name' })
  @Column({ type: 'varchar', length: 150, default: 'OmniStore' })
  platformName: string;

  @ApiProperty({ example: 'https://omnistore.example.com', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl?: string;

  @ApiProperty({ example: 'support@omnistore.example.com', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @ApiProperty({ example: '+1-800-555-0199', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @ApiProperty({ example: 'https://cdn.example.com/branding/logo.png', required: false })
  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @ApiProperty({ example: 'https://cdn.example.com/branding/favicon.ico', required: false })
  @Column({ type: 'text', nullable: true })
  faviconUrl?: string;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  // Marketplace Economics & Commission
  @ApiProperty({ example: 5.0, description: 'Platform commission percentage per order (e.g. 5.0 = 5%)', default: 0.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  commissionRate: number;

  @ApiProperty({ example: 0.3, description: 'Fixed platform fee per order in default currency (e.g. 0.30 = $0.30)', default: 0.0 })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  fixedFee: number;

  // Stripe Gateway Metadata
  @ApiProperty({ example: 'acct_1234567890', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeAccountId?: string;

  @ApiProperty({ example: 'pk_test_1234567890', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePublishableKey?: string;

  @ApiProperty({ example: false, default: false })
  @Column({ type: 'boolean', default: false })
  isStripeEnabled: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
