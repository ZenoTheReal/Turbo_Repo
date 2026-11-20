import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CheckSubdomainDto {
  @ApiProperty({
    example: 'nike',
    description: 'Subdomain candidate to verify for format, blacklist, and database availability',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Subdomain must be at least 3 characters long' })
  @MaxLength(63, { message: 'Subdomain cannot exceed 63 characters' })
  subdomain: string;
}
