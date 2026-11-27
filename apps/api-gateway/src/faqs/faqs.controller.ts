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
import { FaqsService } from './faqs.service.js';
import { CreateFaqDto } from './dto/create-faq.dto.js';
import { UpdateFaqDto } from './dto/update-faq.dto.js';
import { FindFaqsQueryDto } from './dto/find-faqs-query.dto.js';

@ApiTags('FAQs')
@Controller()
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get('faqs')
  @ApiOperation({ summary: 'Get published FAQs for public storefront website' })
  getPublicFaqs(@Query() query: FindFaqsQueryDto) {
    return this.faqsService.findPublic(query);
  }

  @Get('admin/faqs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] List, search, filter, and sort all FAQs' })
  getAdminFaqs(@Query() query: FindFaqsQueryDto) {
    return this.faqsService.findAdmin(query);
  }

  @Post('admin/faqs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Create a new FAQ entry' })
  createFaq(@Body() dto: CreateFaqDto) {
    return this.faqsService.create(dto);
  }

  @Patch('admin/faqs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update an existing FAQ entry' })
  updateFaq(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFaqDto) {
    return this.faqsService.update(id, dto);
  }

  @Delete('admin/faqs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Delete an FAQ entry' })
  deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqsService.remove(id);
  }
}
