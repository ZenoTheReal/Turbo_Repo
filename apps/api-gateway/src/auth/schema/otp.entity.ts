import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OtpType } from '@repo/common';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  email: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ length: 6 })
  code: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  type: OtpType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
