import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetPresignedUrlDto {
  @ApiProperty({ example: 'my-avatar.png', description: 'Original filename with extension' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: 'image/png',
    description: 'MIME type (e.g. image/jpeg, image/png, image/webp, application/pdf, video/mp4)',
  })
  @IsString()
  @IsNotEmpty()
  mimetype: string;
}
