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
import { ProductStatus } from '@repo/common';
import { Category } from '../../categories/schema/category.entity.js';

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  options?: Record<string, string>;
}

@Entity('products')
@Index('idx_products_store_slug', ['storeId', 'slug'], { unique: true })
@Index('idx_products_store_status', ['storeId', 'status'])
@Index('idx_products_store_category', ['storeId', 'categoryId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // --- Pricing Structure ---
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  mrp: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  sellingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice?: number | null;

  // --- Inventory Management ---
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode?: string;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'int', default: 5 })
  lowStockThreshold: number;

  @Column({ type: 'boolean', default: true })
  trackInventory: boolean;

  @Column({ type: 'boolean', default: false })
  allowBackorder: boolean;

  // --- Catalog State & Media ---
  @Column({
    type: 'varchar',
    length: 30,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  variants?: ProductVariant[] | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
