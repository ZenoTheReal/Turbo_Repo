import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@repo/common';
import { SettingsService } from './settings.service.js';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Platform Settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public endpoint for storefronts and client apps
  @Get('settings/public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sanitized public platform info (branding, contact, logo)' })
  @ApiResponse({ status: 200, description: 'Public platform metadata retrieved' })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  // Admin-only: Retrieve complete platform settings including financials
  @Get('admin/settings')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Retrieve complete platform settings including commission and payment configuration' })
  @ApiResponse({ status: 200, description: 'Complete platform settings retrieved' })
  async getAdminSettings() {
    return this.settingsService.getSettings();
  }

  // Admin-only: Update platform settings, fees, and promote new branding assets
  @Patch('admin/settings')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update platform settings, commission fees, and promote new branding assets' })
  @ApiResponse({ status: 200, description: 'Platform settings updated successfully' })
  async updateAdminSettings(@Body() dto: UpdatePlatformSettingsDto) {
    const updated = await this.settingsService.updateSettings(dto);
    return {
      message: 'Platform settings updated successfully',
      settings: updated,
    };
  }
}
