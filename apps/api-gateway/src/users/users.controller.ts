import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '@repo/common';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // 👤 Any logged-in user can get their own profile:
    @Get('profile-details')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get profile of current logged-in user' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getProfile(@CurrentUser() user: CurrentUserPayload) {
        return {
            message: 'Profile retrieved successfully',
            user,
        };
    }

    // 👑 ONLY ADMIN can list all users:
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users (ADMIN only)' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    getAllUsers() {
        return this.usersService.findAll();
    }
}