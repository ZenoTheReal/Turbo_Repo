import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
} from 'class-validator';

export class RecordOrderPaymentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  orderNumber: string;

  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsUUID()
  buyerId?: string | null;

  @IsEmail()
  buyerEmail: string;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string | null;
}
