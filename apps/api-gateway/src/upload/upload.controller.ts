import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { StorageService } from '../config/storage/storage.service.js';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto.js';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  // 1. Presigned Upload URL (Direct 50MB upload from Browser to Supabase S3)
  @Post('presigned-url')
  @ApiOperation({
    summary: 'Generate a presigned S3 PUT URL for direct 50MB browser-to-S3 upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated. Client makes HTTP PUT with raw binary to uploadUrl.',
  })
  async getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
    const result = await this.storageService.getPresignedUploadUrl(dto.filename, dto.mimetype);
    return {
      success: true,
      message: 'Upload file directly to uploadUrl using HTTP PUT with Content-Type header. Then use fileKey in your domain API.',
      ...result,
    };
  }

  // 2. Direct Multipart Upload (Server fallback, 50MB limit)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
    }),
  )
  @ApiOperation({
    summary: 'Direct multipart file upload (Max 50MB) — Staged in temp/ and returns fileKey',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Binary file to upload (Max 50MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File staged in temp/' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file is required for upload');
    }

    const result = await this.storageService.uploadTemp(file);
    return {
      success: true,
      message: 'File staged in temp directory. Provide fileKey in your domain API to commit it.',
      ...result,
    };
  }
}
