import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FaqCategory } from '../schema/faq.entity.js';

export class CreateFaqDto {
  @ApiProperty({ example: 'How do refunds work?' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ example: 'Refunds are processed back to your original payment method within 5-7 business days.' })
  @IsNotEmpty()
  @IsString()
  answer: string;

  @ApiPropertyOptional({ enum: FaqCategory, default: FaqCategory.GENERAL })
  @IsOptional()
  @IsEnum(FaqCategory)
  category?: FaqCategory = FaqCategory.GENERAL;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;
}
