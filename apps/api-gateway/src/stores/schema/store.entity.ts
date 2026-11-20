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

  @ApiProperty({ example: 'https://cdn.example.com/stores/store-123-logo.png', required: false })
  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @ApiProperty({ example: 'https://cdn.example.com/stores/store-123-banner.png', required: false })
  @Column({ type: 'text', nullable: true })
  bannerUrl?: string;

  @ApiProperty({ example: 'contact@nikestore.com', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @ApiProperty({ example: '+1-555-0199', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

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
