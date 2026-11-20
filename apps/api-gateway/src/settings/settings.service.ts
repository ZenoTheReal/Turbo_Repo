import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { StorageService } from '../config/storage/storage.service.js';
import { PlatformSettings } from './schema/platform-settings.entity.js';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto.js';

export interface PublicPlatformInfo {
  platformName: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  faviconUrl?: string;
  currency: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly settingsRepository: Repository<PlatformSettings>;

  constructor(
    private readonly database: Database,
    private readonly storageService: StorageService,
  ) {
    this.settingsRepository = this.database.dataSource.getRepository(PlatformSettings);
  }

  /**
   * Retrieves the singleton platform settings record (id: 1).
   * Automatically initializes the record with default values if it does not yet exist.
   */
  async getSettings(): Promise<PlatformSettings> {
    let settings = await this.settingsRepository.findOne({ where: { id: 1 } });

    if (!settings) {
      settings = this.settingsRepository.create({
        id: 1,
        platformName: 'OmniStore',
        currency: 'USD',
        commissionRate: 0.0,
        fixedFee: 0.0,
        isStripeEnabled: false,
      });
      settings = await this.settingsRepository.save(settings);
      this.logger.log('Default platform settings initialized (id: 1)');
    }

    return settings;
  }

  /**
   * Returns sanitized, non-sensitive platform metadata for public storefronts and client footers.
   */
  async getPublicSettings(): Promise<PublicPlatformInfo> {
    const settings = await this.getSettings();
    return {
      platformName: settings.platformName,
      websiteUrl: settings.websiteUrl,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      currency: settings.currency,
    };
  }

  /**
   * Updates platform configuration and handles S3 asset relocation into branding/ folder.
   */
  async updateSettings(dto: UpdatePlatformSettingsDto): Promise<PlatformSettings> {
    const settings = await this.getSettings();

    // 1. Promote platform logo from temp/ to branding/
    if (dto.logoKey && dto.logoKey.startsWith('temp/')) {
      const fileExtension = dto.logoKey.split('.').pop() || 'png';
      const destinationKey = `branding/platform-logo-${Date.now()}.${fileExtension}`;

      const permanentUrl = await this.storageService.relocateFile(dto.logoKey, destinationKey);

      // Clean up previous logo from S3 if present
      const oldKey = this.storageService.extractKeyFromUrl(settings.logoUrl);
      if (oldKey) {
        await this.storageService.deleteFile(oldKey);
      }

      settings.logoUrl = permanentUrl;
      this.logger.log(`Platform logo updated and relocated to ${destinationKey}`);
    }

    // 2. Promote platform favicon from temp/ to branding/
    if (dto.faviconKey && dto.faviconKey.startsWith('temp/')) {
      const fileExtension = dto.faviconKey.split('.').pop() || 'ico';
      const destinationKey = `branding/platform-favicon-${Date.now()}.${fileExtension}`;

      const permanentUrl = await this.storageService.relocateFile(dto.faviconKey, destinationKey);

      // Clean up previous favicon from S3 if present
      const oldKey = this.storageService.extractKeyFromUrl(settings.faviconUrl);
      if (oldKey) {
        await this.storageService.deleteFile(oldKey);
      }

      settings.faviconUrl = permanentUrl;
      this.logger.log(`Platform favicon updated and relocated to ${destinationKey}`);
    }

    // 3. Update scalar identity and contact fields
    if (dto.platformName !== undefined) settings.platformName = dto.platformName;
    if (dto.websiteUrl !== undefined) settings.websiteUrl = dto.websiteUrl;
    if (dto.contactEmail !== undefined) settings.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) settings.contactPhone = dto.contactPhone;
    if (dto.currency !== undefined) settings.currency = dto.currency;

    // 4. Update financial & commission fields (safely coerce to numbers)
    if (dto.commissionRate !== undefined) {
      settings.commissionRate = Number(dto.commissionRate);
    }
    if (dto.fixedFee !== undefined) {
      settings.fixedFee = Number(dto.fixedFee);
    }

    // 5. Update Stripe gateway metadata hooks
    if (dto.stripeAccountId !== undefined) settings.stripeAccountId = dto.stripeAccountId;
    if (dto.stripePublishableKey !== undefined) settings.stripePublishableKey = dto.stripePublishableKey;
    if (dto.isStripeEnabled !== undefined) settings.isStripeEnabled = dto.isStripeEnabled;

    return this.settingsRepository.save(settings);
  }
}
