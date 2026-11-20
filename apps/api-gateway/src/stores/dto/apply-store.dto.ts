import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class ApplyStoreDto {
  @ApiProperty({ example: 'Nike Official Store', description: 'Display name of the storefront' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: 'nike',
    description: 'Unique lowercase subdomain (3-63 characters, letters, numbers, and hyphens)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Subdomain must be at least 3 characters long' })
  @MaxLength(63, { message: 'Subdomain cannot exceed 63 characters' })
  @Matches(/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/, {
    message: 'Subdomain must be lowercase alphanumeric and may contain hyphens, but cannot start or end with a hyphen',
  })
  subdomain: string;

  @ApiPropertyOptional({ example: 'Official athletic footwear and apparel store' })
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

  // --- Legal / Compliance ---
  @ApiPropertyOptional({ example: 'Nike Retail Operations Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalBusinessName?: string;

  @ApiPropertyOptional({ example: 'US123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ example: 'One Bowerman Drive' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessAddress?: string;

  @ApiPropertyOptional({ example: 'Beaverton' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'OR' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '97005' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'US', default: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // --- S3 Temporary File Keys ---
  @ApiPropertyOptional({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-logo.png',
    description: 'Temporary fileKey from POST /api/upload to be promoted to stores/ folder',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-banner.png',
    description: 'Temporary fileKey from POST /api/upload to be promoted to stores/ folder',
  })
  @IsOptional()
  @IsString()
  bannerKey?: string;

  @ApiPropertyOptional({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-favicon.ico',
    description: 'Temporary fileKey from POST /api/upload to be promoted to stores/ folder',
  })
  @IsOptional()
  @IsString()
  faviconKey?: string;
}
