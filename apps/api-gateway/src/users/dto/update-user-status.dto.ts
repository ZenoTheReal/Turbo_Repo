import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@repo/common';

export class UpdateUserStatusDto {
    @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE })
    @IsEnum(UserStatus)
    @IsNotEmpty()
    status: UserStatus;
}