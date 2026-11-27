import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum FaqCategory {
  GENERAL = 'GENERAL',
  BUYERS = 'BUYERS',
  SELLERS = 'SELLERS',
  PAYMENTS = 'PAYMENTS',
  SHIPPING = 'SHIPPING',
}

@Entity('faqs')
@Index('idx_faqs_category_order', ['category', 'displayOrder'])
@Index('idx_faqs_published', ['isPublished'])
export class Faq {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'How do I become a seller on OmniStore?' })
  @Column({ type: 'varchar', length: 500 })
  question: string;

  @ApiProperty({ example: 'Sign up for a Seller account, verify your email, and apply for a storefront.' })
  @Column({ type: 'text' })
  answer: string;

  @ApiProperty({ enum: FaqCategory, default: FaqCategory.GENERAL })
  @Column({ type: 'varchar', length: 40, default: FaqCategory.GENERAL })
  category: FaqCategory;

  @ApiProperty({ example: 0, default: 0 })
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
