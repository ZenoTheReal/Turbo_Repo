import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'The long-lived refresh token (optional if sent via httpOnly cookie by browser)',
        required: false,
    })
    @IsOptional()
    @IsString()
    refreshToken?: string;
}