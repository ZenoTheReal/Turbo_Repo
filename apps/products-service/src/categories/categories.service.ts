import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { Category } from './schema/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  private readonly categoryRepository: Repository<Category>;

  constructor(private readonly database: Database) {
    this.categoryRepository = this.database.dataSource.getRepository(Category);
  }

  private normalizeSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createCategory(storeId: string, dto: CreateCategoryDto): Promise<Category> {
    const slug = this.normalizeSlug(dto.slug || dto.name);

    const existing = await this.categoryRepository.findOne({
      where: { storeId, slug },
    });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists for this store.`);
    }

    if (dto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: dto.parentId, storeId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID "${dto.parentId}" was not found.`);
      }
    }

    const category = this.categoryRepository.create({
      storeId,
      name: dto.name,
      slug,
      description: dto.description,
      imageUrl: dto.imageUrl,
      parentId: dto.parentId ?? null,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });

    return this.categoryRepository.save(category);
  }

  async updateCategory(storeId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(storeId, id);

    if (dto.slug && dto.slug !== category.slug) {
      const slug = this.normalizeSlug(dto.slug);
      const existing = await this.categoryRepository.findOne({
        where: { storeId, slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category with slug "${slug}" already exists.`);
      }
      category.slug = slug;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent.');
      }
      if (dto.parentId !== null) {
        const parent = await this.categoryRepository.findOne({
          where: { id: dto.parentId, storeId },
        });
        if (!parent) {
          throw new NotFoundException(`Parent category "${dto.parentId}" was not found.`);
        }
      }
      category.parentId = dto.parentId;
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    if (dto.displayOrder !== undefined) category.displayOrder = dto.displayOrder;

    return this.categoryRepository.save(category);
  }

  async findById(storeId: string, id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, storeId },
      relations: { parent: true, children: true },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" was not found.`);
    }
    return category;
  }

  async findCategories(storeId: string, includeInactive = false): Promise<Category[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.storeId = :storeId', { storeId })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (!includeInactive) {
      query.andWhere('category.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Returns a hierarchical nested tree of categories for storefront navigation.
   */
  async findCategoryTree(storeId: string): Promise<Category[]> {
    const allCategories = await this.findCategories(storeId, false);
    const categoryMap = new Map<string, Category & { children: Category[] }>();

    for (const cat of allCategories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    const tree: Category[] = [];

    for (const cat of allCategories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    return tree;
  }

  /**
   * Recursively collects all descendant category IDs under a given root category ID,
   * including the root category ID itself.
   */
  async getDescendantCategoryIds(storeId: string, rootCategoryId: string): Promise<string[]> {
    const allCategories = await this.findCategories(storeId, false);
    const ids: string[] = [rootCategoryId];

    const collectChildren = (parentId: string) => {
      const children = allCategories.filter((c) => c.parentId === parentId);
      for (const child of children) {
        ids.push(child.id);
        collectChildren(child.id);
      }
    };

    collectChildren(rootCategoryId);
    return ids;
  }

  async deleteCategory(storeId: string, id: string): Promise<{ success: boolean; id: string }> {
    const category = await this.findById(storeId, id);
    await this.categoryRepository.remove(category);
    return { success: true, id };
  }
}
