import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OtpType } from '@repo/common';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: OtpType, example: OtpType.SIGNUP_VERIFICATION })
  @IsEnum(OtpType, { message: 'Invalid OTP type' })
  @IsNotEmpty()
  type: OtpType;
}
