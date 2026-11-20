import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // Pass the temporary fileKey from POST /api/upload (e.g. 'temp/123-avatar.png')
  @ApiProperty({
    example: 'temp/123e4567-e89b-12d3-a456-426614174000-photo.png',
    required: false,
    description: 'The temporary fileKey returned from POST /api/upload or presigned upload',
  })
  @IsOptional()
  @IsString()
  avatarKey?: string;
}
