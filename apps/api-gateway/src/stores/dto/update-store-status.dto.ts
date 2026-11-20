import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StoreStatus } from '@repo/common';

export class UpdateStoreStatusDto {
  @ApiProperty({
    enum: StoreStatus,
    example: StoreStatus.ACTIVE,
    description: 'Target store status (ACTIVE = approve and provision, REJECTED = decline, SUSPENDED = deactivate)',
  })
  @IsEnum(StoreStatus)
  status: StoreStatus;

  @ApiPropertyOptional({
    example: 'Business registration documentation incomplete',
    description: 'Reason provided to merchant when rejecting or suspending the storefront',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
