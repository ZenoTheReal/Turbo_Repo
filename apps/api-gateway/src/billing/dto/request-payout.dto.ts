import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayRequestPayoutDto {
  @ApiProperty({ example: 150.0, description: 'Amount to withdraw from available store balance' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Weekly payout settlement' })
  @IsOptional()
  @IsString()
  notes?: string;
}
