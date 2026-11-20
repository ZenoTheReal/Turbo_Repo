import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'seller@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsNotEmpty()
    password: string;

    @ApiPropertyOptional({
        example: 'nike',
        description: 'Storefront subdomain if logging in as a store customer',
    })
    @IsOptional()
    @IsString()
    subdomain?: string;
}