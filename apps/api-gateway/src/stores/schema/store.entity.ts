import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StoreStatus } from '@repo/common';
import { User } from '../../users/schema/user.entity.js';

@Entity('stores')
export class Store {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Nike Official Store' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ example: 'nike', description: 'Unique, lowercase subdomain slug' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 63, unique: true })
  subdomain: string;

  @ApiProperty({ example: 'store.nike.com', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  customDomain?: string;

  @ApiProperty({ enum: StoreStatus, default: StoreStatus.PENDING_APPROVAL })
  @Column({
    type: 'varchar',
    length: 30,
    default: StoreStatus.PENDING_APPROVAL,
  })
  status: StoreStatus;

  @ApiProperty({ example: 'Official sportswear and sneaker merchandise', required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: 'Just Do It. Premium athletic gear.', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  tagline?: string;

  // --- Visual Branding Assets (S3) ---
  @ApiProperty({ example: 'https://cdn.example.com/stores/store-123-logo.png', required: false })
  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @ApiProperty({ example: 'https://cdn.example.com/stores/store-123-banner.png', required: false })
  @Column({ type: 'text', nullable: true })
  bannerUrl?: string;

  @ApiProperty({ example: 'https://cdn.example.com/stores/store-123-favicon.ico', required: false })
  @Column({ type: 'text', nullable: true })
  faviconUrl?: string;

  // --- Storefront Operation State ---
  @ApiProperty({ example: true, default: true, description: 'Store active status or vacation mode' })
  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @ApiProperty({ example: 'We are closed for inventory counting. Reopening Monday!', required: false })
  @Column({ type: 'text', nullable: true })
  maintenanceNotice?: string;

  // --- Contact Information ---
  @ApiProperty({ example: 'contact@nikestore.com', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @ApiProperty({ example: '+1-555-0199', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  // --- Legal, Compliance & Invoicing ---
  @ApiProperty({ example: 'Nike Retail Operations Inc.', required: false })
  @Column({ type: 'varchar', length: 200, nullable: true })
  legalBusinessName?: string;

  @ApiProperty({ example: 'US123456789', required: false, description: 'VAT, GSTIN, or EIN number' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId?: string;

  @ApiProperty({ example: 'One Bowerman Drive', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  businessAddress?: string;

  @ApiProperty({ example: 'Beaverton', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @ApiProperty({ example: 'OR', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @ApiProperty({ example: '97005', required: false })
  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @ApiProperty({ example: 'US', default: 'US', description: 'ISO 3166-1 alpha-2 country code' })
  @Column({ type: 'varchar', length: 2, default: 'US' })
  country: string;

  // --- Currency & Stripe Connect Financials ---
  @ApiProperty({ example: 'USD', default: 'USD', description: 'ISO 4217 standard currency code' })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ example: 'acct_1N2o3p4q5r6s7t8u', required: false, description: 'Stripe Connect Custom/Express account' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeAccountId?: string;

  @ApiProperty({ example: false, default: false })
  @Column({ type: 'boolean', default: false })
  isPayoutsEnabled: boolean;

  // --- Dynamic Storefront Customization (JSONB) ---
  @ApiProperty({
    example: { primaryColor: '#111827', accentColor: '#f59e0b', fontFamily: 'Inter' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  themeSettings?: Record<string, any>;

  @ApiProperty({
    example: { instagram: 'https://instagram.com/nike', twitter: 'https://x.com/nike' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: Record<string, string>;

  // --- Public Policies ---
  @ApiProperty({ example: '30-day money-back guarantee on all unworn items.', required: false })
  @Column({ type: 'text', nullable: true })
  returnPolicy?: string;

  @ApiProperty({ example: 'Standard domestic shipping delivers in 3 to 5 business days.', required: false })
  @Column({ type: 'text', nullable: true })
  shippingPolicy?: string;

  @ApiProperty({ example: 'We collect minimal personal data necessary to fulfill orders.', required: false })
  @Column({ type: 'text', nullable: true })
  privacyPolicy?: string;

  // --- Rejection & Review ---
  @ApiProperty({ example: 'Documentation incomplete', required: false })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId', referencedColumnName: 'id' })
  owner: User;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
