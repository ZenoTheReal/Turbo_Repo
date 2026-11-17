import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldSecretPass123!', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Current password must be at least 6 characters long' })
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecretPass123!', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  @IsNotEmpty()
  newPassword: string;
}
