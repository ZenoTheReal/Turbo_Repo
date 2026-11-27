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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@repo/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CmsService } from './cms.service.js';
import { CreateCmsPageDto } from './dto/create-cms-page.dto.js';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto.js';
import { FindCmsPagesQueryDto } from './dto/find-cms-pages-query.dto.js';

@ApiTags('CMS Pages')
@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('cms')
  @ApiOperation({ summary: 'List published CMS pages (Terms, Privacy Policy, etc.) for public site' })
  getPublicPages() {
    return this.cmsService.findPublicList();
  }

  @Get('cms/:slug')
  @ApiOperation({ summary: 'Fetch a single published CMS page by slug (e.g. terms-and-conditions)' })
  getPublicPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.findPublicBySlug(slug);
  }

  @Get('admin/cms/check-slug')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Check whether a CMS page slug is available' })
  checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.cmsService.checkSlugAvailability(slug, excludeId);
  }

  @Get('admin/cms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] List, search, filter, and sort all CMS pages' })
  getAdminPages(@Query() query: FindCmsPagesQueryDto) {
    return this.cmsService.findAdmin(query);
  }

  @Post('admin/cms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Create a CMS page (Terms, Policy, Legal)' })
  createPage(@Body() dto: CreateCmsPageDto) {
    return this.cmsService.create(dto);
  }

  @Patch('admin/cms/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update a CMS page by ID' })
  updatePage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCmsPageDto) {
    return this.cmsService.update(id, dto);
  }

  @Delete('admin/cms/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Delete a CMS page by ID' })
  deletePage(@Param('id', ParseUUIDPipe) id: string) {
    return this.cmsService.remove(id);
  }
}
