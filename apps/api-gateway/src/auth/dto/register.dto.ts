import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional, IsString } from 'class-validator';
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

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ enum: UserRole, example: UserRole.SELLER, required: false, default: UserRole.BUYER })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({
        example: 'nike',
        description: 'Storefront subdomain if registering as a buyer on a specific store',
    })
    @IsOptional()
    @IsString()
    subdomain?: string;
}