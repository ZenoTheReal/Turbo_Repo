import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { Product } from './schema/product.entity.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { ProductStatus } from '@repo/common';
import { CategoriesService } from '../categories/categories.service.js';

@Injectable()
export class ProductsService {
  private readonly productRepository: Repository<Product>;

  constructor(
    private readonly database: Database,
    private readonly categoriesService: CategoriesService,
  ) {
    this.productRepository = this.database.dataSource.getRepository(Product);
  }

  private normalizeSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createProduct(storeId: string, dto: CreateProductDto): Promise<Product> {
    const slug = this.normalizeSlug(dto.slug || dto.title);

    const existing = await this.productRepository.findOne({
      where: { storeId, slug },
    });
    if (existing) {
      throw new ConflictException(`Product with slug "${slug}" already exists for this store.`);
    }

    if (dto.sellingPrice > dto.mrp) {
      throw new BadRequestException('Selling price cannot exceed the Maximum Retail Price (MRP).');
    }

    const product = this.productRepository.create({
      storeId,
      title: dto.title,
      slug,
      description: dto.description,
      mrp: dto.mrp,
      sellingPrice: dto.sellingPrice,
      costPrice: dto.costPrice ?? null,
      sku: dto.sku,
      barcode: dto.barcode,
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 5,
      trackInventory: dto.trackInventory ?? true,
      allowBackorder: dto.allowBackorder ?? false,
      status: dto.status ?? ProductStatus.DRAFT,
      images: dto.images ?? [],
      variants: dto.variants ?? null,
      attributes: dto.attributes ?? null,
      isFeatured: dto.isFeatured ?? false,
      categoryId: dto.categoryId ?? null,
    });

    return this.productRepository.save(product);
  }

  async updateProduct(storeId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(storeId, id);

    if (dto.slug && dto.slug !== product.slug) {
      const slug = this.normalizeSlug(dto.slug);
      const existing = await this.productRepository.findOne({
        where: { storeId, slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Product with slug "${slug}" already exists.`);
      }
      product.slug = slug;
    }

    const mrp = dto.mrp !== undefined ? dto.mrp : product.mrp;
    const sellingPrice = dto.sellingPrice !== undefined ? dto.sellingPrice : product.sellingPrice;
    if (sellingPrice > mrp) {
      throw new BadRequestException('Selling price cannot exceed the Maximum Retail Price (MRP).');
    }

    if (dto.title !== undefined) product.title = dto.title;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.mrp !== undefined) product.mrp = dto.mrp;
    if (dto.sellingPrice !== undefined) product.sellingPrice = dto.sellingPrice;
    if (dto.costPrice !== undefined) product.costPrice = dto.costPrice;
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;
    if (dto.stockQuantity !== undefined) product.stockQuantity = dto.stockQuantity;
    if (dto.lowStockThreshold !== undefined) product.lowStockThreshold = dto.lowStockThreshold;
    if (dto.trackInventory !== undefined) product.trackInventory = dto.trackInventory;
    if (dto.allowBackorder !== undefined) product.allowBackorder = dto.allowBackorder;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.images !== undefined) product.images = dto.images;
    if (dto.variants !== undefined) product.variants = dto.variants;
    if (dto.attributes !== undefined) product.attributes = dto.attributes;
    if (dto.isFeatured !== undefined) product.isFeatured = dto.isFeatured;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;

    return this.productRepository.save(product);
  }

  async findById(storeId: string, id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, storeId },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" was not found.`);
    }
    return product;
  }

  async findBySlug(storeId: string, slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug: this.normalizeSlug(slug), storeId },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" was not found.`);
    }
    return product;
  }

  async findProducts(storeId: string, query: QueryProductDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.storeId = :storeId', { storeId });

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.categoryId) {
      const categoryIds = await this.categoriesService.getDescendantCategoryIds(
        storeId,
        query.categoryId,
      );
      qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (query.isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', { isFeatured: query.isFeatured });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.sellingPrice >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.sellingPrice <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.search) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.title) LIKE :search OR LOWER(product.description) LIKE :search OR LOWER(product.sku) LIKE :search)',
        { search },
      );
    }

    const validSortFields = ['createdAt', 'sellingPrice', 'title', 'stockQuantity'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`product.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async deleteProduct(storeId: string, id: string): Promise<{ success: boolean; id: string }> {
    const product = await this.findById(storeId, id);
    await this.productRepository.softRemove(product);
    return { success: true, id };
  }

  // --- Inventory Reservation & Deduction for Orders ---
  async reserveStock(
    storeId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
  ): Promise<{ success: boolean; reserved: boolean }> {
    for (const item of items) {
      const product = await this.findById(storeId, item.productId);
      if (product.trackInventory && !product.allowBackorder) {
        if (product.stockQuantity < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for product "${product.title}". Requested: ${item.quantity}, Available: ${product.stockQuantity}`,
          );
        }
      }
    }
    return { success: true, reserved: true };
  }

  async deductStock(
    storeId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
  ): Promise<{ success: boolean }> {
    for (const item of items) {
      const product = await this.findById(storeId, item.productId);
      if (product.trackInventory) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        await this.productRepository.save(product);
      }
    }
    return { success: true };
  }

  async releaseStock(
    storeId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
  ): Promise<{ success: boolean }> {
    for (const item of items) {
      const product = await this.findById(storeId, item.productId);
      if (product.trackInventory) {
        product.stockQuantity += item.quantity;
        await this.productRepository.save(product);
      }
    }
    return { success: true };
  }
}
