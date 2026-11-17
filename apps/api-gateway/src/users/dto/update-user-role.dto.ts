import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@repo/common';

export class UpdateUserRoleDto {
    @ApiProperty({ enum: UserRole, example: UserRole.SELLER })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;
}