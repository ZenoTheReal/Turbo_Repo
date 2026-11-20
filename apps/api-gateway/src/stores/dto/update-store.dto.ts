import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  MaxLength,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: 'Nike Global Store' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated store description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Just Do It. Premium athletic gear.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional({ example: 'support@nikestore.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1-800-555-0199' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'store.nike.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({ example: 'We are closed for inventory counting. Reopening Monday!' })
  @IsOptional()
  @IsString()
  maintenanceNotice?: string;

  // --- S3 Keys for Relocation ---
  @ApiPropertyOptional({ example: 'temp/uuid-logo.png' })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({ example: 'temp/uuid-banner.png' })
  @IsOptional()
  @IsString()
  bannerKey?: string;

  @ApiPropertyOptional({ example: 'temp/uuid-favicon.ico' })
  @IsOptional()
  @IsString()
  faviconKey?: string;

  // --- Dynamic Storefront Customization ---
  @ApiPropertyOptional({
    example: { primaryColor: '#000000', secondaryColor: '#ff0000', fontFamily: 'Inter' },
  })
  @IsOptional()
  @IsObject()
  themeSettings?: Record<string, any>;

  @ApiPropertyOptional({
    example: { instagram: 'https://instagram.com/nike', x: 'https://x.com/nike' },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  // --- Policies ---
  @ApiPropertyOptional({ example: '30-day money-back guarantee on all unworn items.' })
  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @ApiPropertyOptional({ example: 'Standard domestic shipping delivers in 3-5 business days.' })
  @IsOptional()
  @IsString()
  shippingPolicy?: string;

  @ApiPropertyOptional({ example: 'We collect minimal personal data necessary to fulfill orders.' })
  @IsOptional()
  @IsString()
  privacyPolicy?: string;
}
