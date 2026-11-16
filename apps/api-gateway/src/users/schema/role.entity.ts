import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('roles')
export class Role {
    @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'BUYER' })
    @Column({ unique: true })
    name: string; // The code used in checks: 'ADMIN', 'SELLER', 'BUYER'

    @ApiProperty({ example: 'Customer Buyer' })
    @Column()
    displayName: string; // Human-friendly label

    @ApiProperty({ example: 'Can browse products and purchase items' })
    @Column({ nullable: true })
    description?: string;

    @CreateDateColumn()
    createdAt: Date;
}