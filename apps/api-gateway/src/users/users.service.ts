import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { User } from './schema/user.entity.js';
import { Role } from './schema/role.entity.js';
import { UserRole, UserStatus } from '@repo/common';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { StorageService } from '../config/storage/storage.service.js';

@Injectable()
export class UsersService {
  private userRepository: Repository<User>;
  private roleRepository: Repository<Role>;

  constructor(
    private readonly database: Database,
    private readonly storageService: StorageService,
  ) {
    this.userRepository = this.database.dataSource.getRepository(User);
    this.roleRepository = this.database.dataSource.getRepository(Role);
  }

  // Find role by name ('ADMIN', 'SELLER', 'BUYER')
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByEmail(
    email: string,
    includePassword = false,
    storeId?: string | null,
  ): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() });

    if (storeId) {
      query.andWhere('user.storeId = :storeId', { storeId });
    } else if (storeId === null) {
      query.andWhere('user.storeId IS NULL');
    }

    if (includePassword) {
      query.addSelect('user.password');
    }

    return query.getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id })
      .getOne();
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phoneNumber?: string; avatarUrl?: string; avatarKey?: string },
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;

    // Relocate file if an avatarKey from staging (temp/) was provided
    if (data.avatarKey && data.avatarKey.startsWith('temp/')) {
      const fileExtension = data.avatarKey.split('.').pop() || 'jpg';
      const destinationKey = `avatars/user-${userId}-${Date.now()}.${fileExtension}`;

      // 1. Relocate in S3 (Copy from temp/ -> avatars/ and delete temp/)
      const permanentUrl = await this.storageService.relocateFile(data.avatarKey, destinationKey);

      // 2. Delete previous avatar from S3 if one already existed
      const oldKey = this.storageService.extractKeyFromUrl(user.avatarUrl);
      if (oldKey) {
        await this.storageService.deleteFile(oldKey);
      }

      user.avatarUrl = permanentUrl;
    } else if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    return this.userRepository.save(user);
  }

  // 1. List all users with pagination, search, sorting & filtering
  async findAll(query: FindUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    // If includeDeleted is true, tell TypeORM to include soft-deleted records
    if (query.includeDeleted) {
      qb.withDeleted();
    }

    // Search across name and email (PostgreSQL ILIKE is case-insensitive)
    if (query.search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Filter by status (ACTIVE, INACTIVE, SUSPENDED)
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    // Filter by role (ADMIN, SELLER, BUYER)
    if (query.role) {
      qb.andWhere('role.name = :role', { role: query.role });
    }

    // Safe column sorting
    const allowedSortColumns: Record<string, string> = {
      createdAt: 'user.createdAt',
      name: 'user.name',
      email: 'user.email',
      status: 'user.status',
    };
    const sortColumn = allowedSortColumns[query.sortBy ?? 'createdAt'] ?? 'user.createdAt';
    const sortDirection = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection);

    qb.skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // 2. Update user status (ACTIVE, INACTIVE, SUSPENDED)
  async updateStatus(id: string, status: UserStatus, currentAdminId: string): Promise<User> {
    if (id === currentAdminId && status !== UserStatus.ACTIVE) {
      throw new BadRequestException('You cannot deactivate your own admin account');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    user.status = status;
    return this.userRepository.save(user);
  }

  // 3. Update user role (ADMIN, SELLER, BUYER)
  async updateRole(id: string, roleName: UserRole, currentAdminId: string): Promise<User> {
    if (id === currentAdminId && roleName !== UserRole.ADMIN) {
      throw new BadRequestException('You cannot remove the ADMIN role from your own account');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    const role = await this.findRoleByName(roleName);
    if (!role) {
      throw new BadRequestException(`Role '${roleName}' does not exist`);
    }

    user.role = role;
    return this.userRepository.save(user);
  }

  // 4. Soft Delete a user
  async softDelete(id: string, currentAdminId: string): Promise<{ message: string }> {
    if (id === currentAdminId) {
      throw new BadRequestException('You cannot delete your own admin account');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await this.userRepository.save(user);

    return { message: `User '${user.email}' has been successfully soft-deleted` };
  }

  // 5. Restore a soft-deleted user
  async restore(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    user.isDeleted = false;
    user.deletedAt = undefined;
    return this.userRepository.save(user);
  }
}