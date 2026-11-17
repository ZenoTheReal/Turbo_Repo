import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { UserRole } from '@repo/common';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // 👤 Any logged-in user: Get own profile
    @Get('profile-details')
    @ApiOperation({ summary: 'Get profile of current logged-in user' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    getProfile(@CurrentUser() user: CurrentUserPayload) {
        return {
            message: 'Profile retrieved successfully',
            user,
        };
    }

    // ==========================================
    // 👑 ADMIN-ONLY ENDPOINTS BELOW
    // ==========================================

    // 1. List all users with pagination, search, sort & filters
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] List all users with pagination, search, sort & filters' })
    @ApiResponse({ status: 200, description: 'Paginated user list with metadata' })
    getAllUsers(@Query() query: FindUsersQueryDto) {
        return this.usersService.findAll(query);
    }

    // 2. Get single user by ID
    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] Get user details by ID' })
    @ApiResponse({ status: 200, description: 'User details' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getUserById(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findById(id);
    }

    // 3. Update user status (ACTIVE, INACTIVE, SUSPENDED)
    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] Update user status (ACTIVE, INACTIVE, SUSPENDED)' })
    @ApiResponse({ status: 200, description: 'User status updated successfully' })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserStatusDto,
        @CurrentUser() admin: CurrentUserPayload,
    ) {
        return this.usersService.updateStatus(id, dto.status, admin.id);
    }

    // 4. Update user role (ADMIN, SELLER, BUYER)
    @Patch(':id/role')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] Update user role' })
    @ApiResponse({ status: 200, description: 'User role updated successfully' })
    updateRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserRoleDto,
        @CurrentUser() admin: CurrentUserPayload,
    ) {
        return this.usersService.updateRole(id, dto.role, admin.id);
    }

    // 5. Soft-delete user
    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] Soft-delete a user' })
    @ApiResponse({ status: 200, description: 'User soft-deleted successfully' })
    softDeleteUser(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() admin: CurrentUserPayload,
    ) {
        return this.usersService.softDelete(id, admin.id);
    }

    // 6. Restore soft-deleted user
    @Patch(':id/restore')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: '[ADMIN] Restore a soft-deleted user' })
    @ApiResponse({ status: 200, description: 'User restored successfully' })
    restoreUser(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.restore(id);
    }
}