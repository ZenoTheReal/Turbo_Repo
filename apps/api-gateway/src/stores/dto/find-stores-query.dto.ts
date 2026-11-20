import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { StoreStatus } from '@repo/common';

export enum StoreSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindStoresQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search keyword matching store name, subdomain, contact email, or owner name/email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: ['createdAt', 'name', 'subdomain', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: StoreSortOrder, default: StoreSortOrder.DESC })
  @IsOptional()
  @IsEnum(StoreSortOrder)
  sortOrder?: StoreSortOrder = StoreSortOrder.DESC;

  @ApiPropertyOptional({ enum: StoreStatus, description: 'Filter by store status' })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @ApiPropertyOptional({ description: 'Include soft-deleted stores', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean = false;
}
