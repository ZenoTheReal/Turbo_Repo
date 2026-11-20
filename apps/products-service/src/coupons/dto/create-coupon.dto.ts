import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { DiscountType, CouponScope } from '@repo/common';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNotEmpty()
  @IsEnum(CouponScope)
  appliesTo: CouponScope;

  @IsOptional()
  @IsArray()
  applicableCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  applicableProductIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimitPerCustomer?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
