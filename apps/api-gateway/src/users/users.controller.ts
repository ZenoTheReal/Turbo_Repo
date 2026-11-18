import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { StorageService } from '../config/storage/storage.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserRole } from '@repo/common';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly storageService: StorageService,
    ) { }

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

    // 👤 Any logged-in user: Update own profile
    @Patch('profile')
    @ApiOperation({ summary: 'Update profile of current logged-in user' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(
        @CurrentUser() currentUser: CurrentUserPayload,
        @Body() dto: UpdateProfileDto,
    ) {
        const updatedUser = await this.usersService.updateProfile(currentUser.id, dto);
        return {
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                avatarUrl: updatedUser.avatarUrl,
                status: updatedUser.status,
                isEmailVerified: updatedUser.isEmailVerified,
                role: updatedUser.role?.name,
            },
        };
    }

    // 📸 Optional Shortcut: Upload avatar image directly in one request
    @Post('profile/avatar')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(
                        new BadRequestException('Only JPG, JPEG, PNG, and WEBP image files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    @ApiOperation({ summary: 'Direct avatar upload shortcut (Max 10MB: JPG, PNG, WEBP)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload as avatar',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({ status: 200, description: 'Avatar uploaded and profile updated successfully' })
    async uploadAvatar(
        @CurrentUser() currentUser: CurrentUserPayload,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Avatar image file is required');
        }

        // 1. Stage in temp
        const staged = await this.storageService.uploadTemp(file);

        // 2. Relocate to permanent avatar
        const updatedUser = await this.usersService.updateProfile(currentUser.id, {
            avatarKey: staged.fileKey,
        });

        return {
            message: 'Avatar uploaded and profile updated successfully',
            avatarUrl: updatedUser.avatarUrl,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatarUrl: updatedUser.avatarUrl,
            },
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