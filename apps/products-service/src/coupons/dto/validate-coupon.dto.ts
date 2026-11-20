import { IsNotEmpty, IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

export interface CartItemContext {
  productId: string;
  categoryId?: string | null;
  price: number;
  quantity: number;
}

export class ValidateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsArray()
  cartItems: CartItemContext[];

  @IsOptional()
  @IsUUID()
  userId?: string;
}
