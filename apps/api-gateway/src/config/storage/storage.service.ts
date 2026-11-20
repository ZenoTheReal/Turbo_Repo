import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface UploadResult {
  fileKey: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrlPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>(
      'S3_ENDPOINT',
      'https://hmbolhoevpojqxwddkmn.storage.supabase.co/storage/v1/s3',
    );
    const region = this.configService.get<string>('S3_REGION', 'ap-south-1');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY', '');

    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'avatars');
    this.publicUrlPrefix = this.configService.get<string>(
      'S3_PUBLIC_URL_PREFIX',
      `https://hmbolhoevpojqxwddkmn.supabase.co/storage/v1/object/public/${this.bucketName}`,
    );

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Supabase S3 & MinIO
    });

    this.logger.log(`S3 Storage Client initialized for bucket '${this.bucketName}' on region '${region}'`);
  }

  /**
   * 1. Generate a Presigned Upload URL for Direct-to-S3 Uploads (Up to 50MB)
   * The client uses this URL to do an HTTP PUT directly to Supabase S3 without loading server memory.
   */
  async getPresignedUploadUrl(filename: string, mimetype: string, expiresIn = 900): Promise<PresignedUrlResult> {
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `temp/${randomUUID()}-${sanitizedName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: mimetype,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Generated presigned upload URL for: ${fileKey}`);

      return {
        uploadUrl,
        fileKey,
        expiresInSeconds: expiresIn,
      };
    } catch (error: any) {
      this.logger.error(`Error generating presigned URL for '${filename}':`, error?.message ?? error);
      throw new InternalServerErrorException(`Could not generate presigned upload URL: ${error?.message}`);
    }
  }

  /**
   * 2. Direct Multipart Upload (Server fallback, 50MB limit)
   */
  async uploadTemp(file: Express.Multer.File): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for upload');
    }

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `temp/${randomUUID()}-${sanitizedName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const url = `${this.publicUrlPrefix}/${fileKey}`;
      this.logger.log(`Temporary file uploaded to S3: ${fileKey}`);

      return {
        fileKey,
        url,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error: any) {
      this.logger.error(`S3 upload error for '${file.originalname}':`, error?.message ?? error);
      throw new InternalServerErrorException(`Failed to upload temporary file: ${error?.message}`);
    }
  }

  /**
   * 3. Relocate (Server-side Move): Copies from temp/ to permanent location, then deletes temp/
   */
  async relocateFile(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      // Step A: Fast S3 Server-side Copy
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: `${this.bucketName}/${sourceKey}`,
          Key: destinationKey,
        }),
      );

      // Step B: Delete the temporary file
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: sourceKey,
        }),
      );

      const permanentUrl = `${this.publicUrlPrefix}/${destinationKey}`;
      this.logger.log(`File relocated from '${sourceKey}' to '${destinationKey}'`);
      return permanentUrl;
    } catch (error: any) {
      this.logger.error(`Failed to relocate file from '${sourceKey}' to '${destinationKey}':`, error?.message ?? error);
      throw new InternalServerErrorException(`Failed to relocate file: ${error?.message}`);
    }
  }

  /**
   * 4. Delete an existing file
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
        }),
      );
      this.logger.log(`Deleted file '${fileKey}' from S3`);
    } catch (error: any) {
      this.logger.warn(`Could not delete file '${fileKey}' from S3: ${error?.message}`);
    }
  }

  /**
   * Helper: Extracts fileKey from a full public CDN URL
   */
  extractKeyFromUrl(url?: string | null): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const prefix = `/storage/v1/object/public/${this.bucketName}/`;
      if (parsed.pathname.includes(prefix)) {
        return parsed.pathname.split(prefix)[1];
      }
      return null;
    } catch {
      return null;
    }
  }
}
