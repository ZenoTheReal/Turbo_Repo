import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('cms_pages')
@Index('idx_cms_pages_slug', ['slug'], { unique: true })
@Index('idx_cms_pages_published', ['isPublished'])
export class CmsPage {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Terms and Conditions' })
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty({ example: 'terms-and-conditions' })
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @ApiPropertyOptional({ example: 'Platform terms governing use of OmniStore.' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  summary?: string | null;

  @ApiProperty({ example: '<h2>1. Acceptance of Terms</h2><p>...</p>' })
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional({ example: 'Terms & Conditions - OmniStore' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  metaTitle?: string | null;

  @ApiPropertyOptional({ example: 'Read the official OmniStore platform terms.' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  metaDescription?: string | null;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
