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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@repo/common';
import { Role } from './role.entity.js';
import type { Store } from '../../stores/schema/store.entity.js';

@Entity('users')
@Index('idx_users_global_email', ['email'], { unique: true, where: '"storeId" IS NULL' })
@Index('idx_users_store_email', ['storeId', 'email'], { unique: true, where: '"storeId" IS NOT NULL' })
@Index('idx_users_store_phone', ['storeId', 'phoneNumber'], { where: '"storeId" IS NOT NULL AND "phoneNumber" IS NOT NULL' })
export class User {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Column()
  email: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @Column()
  name: string;

  @ApiProperty({ example: false, default: false })
  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @ApiPropertyOptional({ example: '+1234567890' })
  @Column({ nullable: true })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @Column({ nullable: true })
  avatarUrl?: string;

  @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Storefront ID if this user is a customer of a specific store',
  })
  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @ManyToOne('Store', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

  @ApiProperty({ example: false, default: false })
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @ApiProperty({ type: () => Role })
  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  role: Role;

  @Column({ nullable: true })
  roleId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
