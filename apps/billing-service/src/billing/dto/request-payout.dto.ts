import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RequestPayoutDto {
  @IsUUID()
  storeId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  requestedByUserId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
