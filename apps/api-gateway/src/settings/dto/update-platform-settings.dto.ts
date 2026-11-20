import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsUrl,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ example: 'OmniStore Market', description: 'Platform display name' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  platformName?: string;

  @ApiPropertyOptional({ example: 'https://omnistore.example.com', description: 'Official website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'support@omnistore.example.com', description: 'Public support email address' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1-800-555-0199', description: 'Public contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'Default currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Platform commission percentage per order (0 to 100, can be 0)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({
    example: 0.3,
    description: 'Fixed platform fee per order in default currency (can be 0)',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @ApiPropertyOptional({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-logo.png',
    description: 'Temporary fileKey from POST /api/upload to be promoted to branding/ folder',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-favicon.ico',
    description: 'Temporary fileKey from POST /api/upload to be promoted to branding/ folder',
  })
  @IsOptional()
  @IsString()
  faviconKey?: string;

  @ApiPropertyOptional({ example: 'acct_1234567890', description: 'Platform primary Stripe Connect Account ID' })
  @IsOptional()
  @IsString()
  stripeAccountId?: string;

  @ApiPropertyOptional({ example: 'pk_test_1234567890', description: 'Stripe publishable API key for client checkout' })
  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @ApiPropertyOptional({ example: false, description: 'Toggle live payment processing via Stripe' })
  @IsOptional()
  @IsBoolean()
  isStripeEnabled?: boolean;
}
