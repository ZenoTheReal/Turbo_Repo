import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from './role.entity.js';

@Entity('users')
export class User {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @Column()
  name: string;

  // 🔑 Foreign Key relation to the 'roles' table
  @ApiProperty({ type: () => Role })
  @ManyToOne(() => Role, { eager: true }) // eager: true automatically loads role with user
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ nullable: true })
  roleId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}