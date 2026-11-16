import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@repo/common';

export class RegisterDto {
    @ApiProperty({ example: 'seller@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: UserRole, example: UserRole.SELLER, required: false, default: UserRole.BUYER })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}