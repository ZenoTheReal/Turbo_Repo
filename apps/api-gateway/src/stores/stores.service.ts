import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Database } from '../config/database/database.js';
import { StorageService } from '../config/storage/storage.service.js';
import { Store } from './schema/store.entity.js';
import { User } from '../users/schema/user.entity.js';
import { ApplyStoreDto } from './dto/apply-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { FindStoresQueryDto, StoreSortOrder } from './dto/find-stores-query.dto.js';
import {
  StoreStatus,
  UserRole,
  UserStatus,
  SERVICES,
  STORE_EVENTS,
  EMAIL_EVENTS,
} from '@repo/common';

const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'mail',
  'email',
  'billing',
  'auth',
  'support',
  'help',
  'docs',
  'cdn',
  'static',
  'assets',
  'root',
  'localhost',
  'dev',
  'staging',
  'test',
  'portal',
  'dashboard',
  'status',
  'shop',
  'store',
  'platform',
  'omnistore',
]);

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);
  private readonly storeRepository: Repository<Store>;
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly database: Database,
    private readonly storageService: StorageService,
    @Inject(SERVICES.EMAIL) private readonly emailClient: ClientProxy,
  ) {
    this.storeRepository = this.database.dataSource.getRepository(Store);
    this.userRepository = this.database.dataSource.getRepository(User);
  }

  /**
   * Normalizes a subdomain string to lowercase and trims whitespace.
   */
  normalizeSubdomain(subdomain: string): string {
    return subdomain.trim().toLowerCase();
  }

  /**
   * Validates subdomain syntax and checks against the reserved keywords blacklist.
   */
  validateSubdomainFormat(subdomain: string): void {
    const normalized = this.normalizeSubdomain(subdomain);

    if (normalized.length < 3 || normalized.length > 63) {
      throw new BadRequestException('Subdomain must be between 3 and 63 characters in length.');
    }

    if (!SUBDOMAIN_REGEX.test(normalized)) {
      throw new BadRequestException(
        'Subdomain must be lowercase alphanumeric and may contain hyphens, but cannot begin or end with a hyphen.',
      );
    }

    if (RESERVED_SUBDOMAINS.has(normalized)) {
      throw new BadRequestException(`Subdomain "${normalized}" is a reserved system keyword.`);
    }
  }

  /**
   * Checks whether a candidate subdomain is valid, not reserved, and currently unused in the database.
   */
  async checkSubdomainAvailability(candidate: string): Promise<{
    subdomain: string;
    isAvailable: boolean;
    message: string;
  }> {
    const normalized = this.normalizeSubdomain(candidate);

    try {
      this.validateSubdomainFormat(normalized);
    } catch (err: any) {
      return {
        subdomain: normalized,
        isAvailable: false,
        message: err.message,
      };
    }

    const existing = await this.storeRepository.findOne({
      where: { subdomain: normalized },
    });

    if (existing) {
      return {
        subdomain: normalized,
        isAvailable: false,
        message: `Subdomain "${normalized}" is already taken.`,
      };
    }

    return {
      subdomain: normalized,
      isAvailable: true,
      message: `Subdomain "${normalized}" is available.`,
    };
  }

  /**
   * Submits a new storefront application for a verified seller account.
   * Performs real-time database validation to prevent subdomain collisions.
   */
  async applyStore(ownerId: string, dto: ApplyStoreDto): Promise<Store> {
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new NotFoundException('Seller account not found.');
    }

    if (owner.role?.name !== UserRole.SELLER) {
      throw new ForbiddenException('Only registered sellers can apply for a storefront.');
    }

    // Check if seller already has an active or pending store
    const existingSellerStore = await this.storeRepository.findOne({
      where: [
        { ownerId, status: StoreStatus.PENDING_APPROVAL },
        { ownerId, status: StoreStatus.ACTIVE },
      ],
    });

    if (existingSellerStore) {
      throw new ConflictException(
        `You already have a storefront in status "${existingSellerStore.status}" (${existingSellerStore.subdomain}).`,
      );
    }

    // Validate syntax and reserved status
    const normalizedSubdomain = this.normalizeSubdomain(dto.subdomain);
    this.validateSubdomainFormat(normalizedSubdomain);

    // Validate database uniqueness
    const existingSubdomain = await this.storeRepository.findOne({
      where: { subdomain: normalizedSubdomain },
    });

    if (existingSubdomain) {
      throw new ConflictException(
        `Subdomain "${normalizedSubdomain}" is already taken. Please choose another subdomain.`,
      );
    }

    // Initialize store entity in PENDING_APPROVAL
    const store = this.storeRepository.create({
      name: dto.name,
      subdomain: normalizedSubdomain,
      description: dto.description,
      tagline: dto.tagline,
      contactEmail: dto.contactEmail ?? owner.email,
      contactPhone: dto.contactPhone ?? owner.phoneNumber,
      legalBusinessName: dto.legalBusinessName,
      taxId: dto.taxId,
      businessAddress: dto.businessAddress,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country ? dto.country.toUpperCase() : 'US',
      currency: dto.currency ? dto.currency.toUpperCase() : 'USD',
      ownerId,
      status: StoreStatus.PENDING_APPROVAL,
    });

    const savedStore = await this.storeRepository.save(store);

    // Promote logo from temp/ to stores/ folder if provided
    if (dto.logoKey && dto.logoKey.startsWith('temp/')) {
      const fileExt = dto.logoKey.split('.').pop() || 'png';
      const destinationKey = `stores/store-${savedStore.id}-logo-${Date.now()}.${fileExt}`;
      savedStore.logoUrl = await this.storageService.relocateFile(dto.logoKey, destinationKey);
    }

    // Promote banner from temp/ to stores/ folder if provided
    if (dto.bannerKey && dto.bannerKey.startsWith('temp/')) {
      const fileExt = dto.bannerKey.split('.').pop() || 'png';
      const destinationKey = `stores/store-${savedStore.id}-banner-${Date.now()}.${fileExt}`;
      savedStore.bannerUrl = await this.storageService.relocateFile(dto.bannerKey, destinationKey);
    }

    // Promote favicon from temp/ to stores/ folder if provided
    if (dto.faviconKey && dto.faviconKey.startsWith('temp/')) {
      const fileExt = dto.faviconKey.split('.').pop() || 'ico';
      const destinationKey = `stores/store-${savedStore.id}-favicon-${Date.now()}.${fileExt}`;
      savedStore.faviconUrl = await this.storageService.relocateFile(dto.faviconKey, destinationKey);
    }

    await this.storeRepository.save(savedStore);

    // Notify microservices of new storefront application
    this.emailClient.emit(STORE_EVENTS.APPLIED, {
      storeId: savedStore.id,
      storeName: savedStore.name,
      subdomain: savedStore.subdomain,
      ownerEmail: owner.email,
      ownerName: owner.name,
    });

    this.logger.log(`New store application created: ${savedStore.name} (${savedStore.subdomain}) by ${owner.email}`);
    return savedStore;
  }

  /**
   * Retrieves stores with advanced pagination, search, sorting, and status filtering.
   */
  async findStores(query: FindStoresQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.owner', 'owner');

    // Soft delete inclusion
    if (query.includeDeleted) {
      qb.withDeleted();
    }

    // Status filter (e.g. ?status=PENDING_APPROVAL, ?status=ACTIVE, etc.)
    if (query.status) {
      qb.andWhere('store.status = :status', { status: query.status });
    }

    // Search filter across store name, subdomain, contact email, and owner identity
    if (query.search) {
      qb.andWhere(
        '(store.name ILIKE :search OR store.subdomain ILIKE :search OR store.contactEmail ILIKE :search OR owner.name ILIKE :search OR owner.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Sorting column mapping
    const allowedSortColumns: Record<string, string> = {
      createdAt: 'store.createdAt',
      name: 'store.name',
      subdomain: 'store.subdomain',
      status: 'store.status',
    };

    const sortColumn = allowedSortColumns[query.sortBy ?? 'createdAt'] ?? 'store.createdAt';
    const sortOrder = query.sortOrder === StoreSortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortOrder);

    // Execution with pagination
    qb.skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retrieves a single store by its primary UUID.
   */
  async findById(id: string): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID "${id}" not found.`);
    }
    return store;
  }

  /**
   * Retrieves the storefront associated with the current logged-in seller.
   */
  async findByOwnerId(ownerId: string): Promise<Store | null> {
    return this.storeRepository.findOne({ where: { ownerId } });
  }

  /**
   * Updates storefront status (ACTIVE = approve & provision, REJECTED = decline, SUSPENDED = deactivate)
   * in a unified API endpoint and coordinates microservice notifications.
   */
  async updateStoreStatus(
    storeId: string,
    targetStatus: StoreStatus,
    adminId: string,
    reason?: string,
  ): Promise<Store> {
    const store = await this.findById(storeId);

    if (store.status === targetStatus) {
      throw new BadRequestException(`Storefront is already in status "${targetStatus}".`);
    }

    if (targetStatus === StoreStatus.ACTIVE) {
      // 1. Approve & provision on the fly
      store.status = StoreStatus.ACTIVE;
      store.approvedAt = new Date();
      store.approvedBy = adminId;
      store.rejectionReason = undefined;

      const updatedStore = await this.storeRepository.save(store);

      // Activate owner account if inactive
      if (store.owner && store.owner.status !== UserStatus.ACTIVE) {
        store.owner.status = UserStatus.ACTIVE;
        await this.userRepository.save(store.owner);
      }

      this.emailClient.emit(STORE_EVENTS.APPROVED, {
        storeId: updatedStore.id,
        storeName: updatedStore.name,
        subdomain: updatedStore.subdomain,
        ownerEmail: store.owner?.email,
        ownerName: store.owner?.name,
      });

      this.emailClient.emit(EMAIL_EVENTS.SEND_STORE_APPROVED, {
        storeId: updatedStore.id,
        storeName: updatedStore.name,
        subdomain: updatedStore.subdomain,
        email: store.owner?.email,
        name: store.owner?.name,
      });

      this.logger.log(`Store approved and provisioned on the fly: ${updatedStore.name} (${updatedStore.subdomain})`);
      return updatedStore;
    } else if (targetStatus === StoreStatus.REJECTED) {
      // 2. Reject application
      store.status = StoreStatus.REJECTED;
      store.rejectionReason = reason ?? 'Application declined by platform administrator.';

      const updatedStore = await this.storeRepository.save(store);

      this.emailClient.emit(STORE_EVENTS.REJECTED, {
        storeId: updatedStore.id,
        storeName: updatedStore.name,
        subdomain: updatedStore.subdomain,
        ownerEmail: store.owner?.email,
        reason: updatedStore.rejectionReason,
      });

      this.emailClient.emit(EMAIL_EVENTS.SEND_STORE_REJECTED, {
        storeId: updatedStore.id,
        storeName: updatedStore.name,
        subdomain: updatedStore.subdomain,
        email: store.owner?.email,
        reason: updatedStore.rejectionReason,
      });

      this.logger.log(`Store application rejected: ${updatedStore.name} (${updatedStore.subdomain}). Reason: ${reason}`);
      return updatedStore;
    } else if (targetStatus === StoreStatus.SUSPENDED) {
      // 3. Suspend live store
      store.status = StoreStatus.SUSPENDED;
      store.rejectionReason = reason ?? 'Store suspended by platform administrator.';

      const updatedStore = await this.storeRepository.save(store);
      this.logger.log(`Store suspended: ${updatedStore.name} (${updatedStore.subdomain}). Reason: ${reason}`);
      return updatedStore;
    }

    throw new BadRequestException(`Unsupported store status transition to "${targetStatus}".`);
  }

  /**
   * Updates an existing storefront profile, theme, and policies.
   */
  async updateStore(storeId: string, ownerId: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Storefront with ID "${storeId}" was not found.`);
    }

    if (store.ownerId !== ownerId) {
      throw new ForbiddenException('You are not authorized to update this storefront.');
    }

    if (dto.name !== undefined) store.name = dto.name;
    if (dto.description !== undefined) store.description = dto.description;
    if (dto.tagline !== undefined) store.tagline = dto.tagline;
    if (dto.contactEmail !== undefined) store.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) store.contactPhone = dto.contactPhone;
    if (dto.customDomain !== undefined) store.customDomain = dto.customDomain;
    if (dto.isOpen !== undefined) store.isOpen = dto.isOpen;
    if (dto.maintenanceNotice !== undefined) store.maintenanceNotice = dto.maintenanceNotice;
    if (dto.themeSettings !== undefined) store.themeSettings = dto.themeSettings;
    if (dto.socialLinks !== undefined) store.socialLinks = dto.socialLinks;
    if (dto.returnPolicy !== undefined) store.returnPolicy = dto.returnPolicy;
    if (dto.shippingPolicy !== undefined) store.shippingPolicy = dto.shippingPolicy;
    if (dto.privacyPolicy !== undefined) store.privacyPolicy = dto.privacyPolicy;

    // Promote and replace logo if a new temporary file was uploaded
    if (dto.logoKey && dto.logoKey.startsWith('temp/')) {
      if (store.logoUrl) {
        const oldKey = this.storageService.extractKeyFromUrl(store.logoUrl);
        if (oldKey) await this.storageService.deleteFile(oldKey);
      }
      const fileExt = dto.logoKey.split('.').pop() || 'png';
      const destinationKey = `stores/store-${store.id}-logo-${Date.now()}.${fileExt}`;
      store.logoUrl = await this.storageService.relocateFile(dto.logoKey, destinationKey);
    }

    // Promote and replace banner
    if (dto.bannerKey && dto.bannerKey.startsWith('temp/')) {
      if (store.bannerUrl) {
        const oldKey = this.storageService.extractKeyFromUrl(store.bannerUrl);
        if (oldKey) await this.storageService.deleteFile(oldKey);
      }
      const fileExt = dto.bannerKey.split('.').pop() || 'png';
      const destinationKey = `stores/store-${store.id}-banner-${Date.now()}.${fileExt}`;
      store.bannerUrl = await this.storageService.relocateFile(dto.bannerKey, destinationKey);
    }

    // Promote and replace favicon
    if (dto.faviconKey && dto.faviconKey.startsWith('temp/')) {
      if (store.faviconUrl) {
        const oldKey = this.storageService.extractKeyFromUrl(store.faviconUrl);
        if (oldKey) await this.storageService.deleteFile(oldKey);
      }
      const fileExt = dto.faviconKey.split('.').pop() || 'ico';
      const destinationKey = `stores/store-${store.id}-favicon-${Date.now()}.${fileExt}`;
      store.faviconUrl = await this.storageService.relocateFile(dto.faviconKey, destinationKey);
    }

    return this.storeRepository.save(store);
  }

  /**
   * Finds a store entity by its subdomain.
   */
  async findBySubdomain(subdomain: string): Promise<Store | null> {
    const normalized = this.normalizeSubdomain(subdomain);
    return this.storeRepository.findOne({
      where: { subdomain: normalized },
    });
  }

  /**
   * Resolves a public, active storefront by its subdomain for Next.js (web-fe).
   */
  async getStorefrontBySubdomain(subdomain: string): Promise<Record<string, any>> {
    const normalized = this.normalizeSubdomain(subdomain);

    const store = await this.storeRepository.findOne({
      where: {
        subdomain: normalized,
        status: StoreStatus.ACTIVE,
      },
    });

    if (!store) {
      throw new NotFoundException(`Storefront "${normalized}" was not found or is currently not active.`);
    }

    return {
      id: store.id,
      name: store.name,
      subdomain: store.subdomain,
      customDomain: store.customDomain,
      description: store.description,
      tagline: store.tagline,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      faviconUrl: store.faviconUrl,
      isOpen: store.isOpen,
      maintenanceNotice: store.maintenanceNotice,
      isPayoutsEnabled: store.isPayoutsEnabled,
      currency: store.currency,
      themeSettings: store.themeSettings ?? {
        primaryColor: '#000000',
        accentColor: '#3b82f6',
        fontFamily: 'Inter',
      },
      socialLinks: store.socialLinks ?? {},
      returnPolicy: store.returnPolicy,
      shippingPolicy: store.shippingPolicy,
      privacyPolicy: store.privacyPolicy,
      contactEmail: store.contactEmail,
      contactPhone: store.contactPhone,
      createdAt: store.createdAt,
    };
  }
}
