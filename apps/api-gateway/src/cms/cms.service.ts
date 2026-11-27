import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { CmsPage } from './schema/cms-page.entity.js';
import { CreateCmsPageDto } from './dto/create-cms-page.dto.js';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto.js';
import { FindCmsPagesQueryDto } from './dto/find-cms-pages-query.dto.js';

@Injectable()
export class CmsService {
  private readonly cmsRepository: Repository<CmsPage>;

  constructor(private readonly database: Database) {
    this.cmsRepository = this.database.dataSource.getRepository(CmsPage);
  }

  private normalizeSlug(raw: string): string {
    return raw.trim().toLowerCase();
  }

  async checkSlugAvailability(rawSlug: string, excludeId?: string) {
    const slug = this.normalizeSlug(rawSlug || '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException(
        'Slug must contain lowercase letters, numbers, and hyphens only.',
      );
    }

    const existing = await this.cmsRepository.findOne({ where: { slug } });
    const available = !existing || (Boolean(excludeId) && existing.id === excludeId);
    return {
      slug,
      available,
      reason: available ? undefined : `Slug "${slug}" is already in use.`,
    };
  }

  async findPublicList() {
    return this.cmsRepository.find({
      where: { isPublished: true },
      select: { id: true, title: true, slug: true, summary: true, updatedAt: true },
      order: { title: 'ASC' },
    });
  }

  async findPublicBySlug(rawSlug: string): Promise<CmsPage> {
    const slug = this.normalizeSlug(rawSlug);
    const page = await this.cmsRepository.findOne({
      where: { slug, isPublished: true },
    });

    if (!page) {
      throw new NotFoundException(`Published CMS page "${slug}" not found.`);
    }

    return page;
  }

  async findAdmin(query: FindCmsPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.cmsRepository.createQueryBuilder('cms');

    if (query.search) {
      qb.andWhere(
        '(cms.title ILIKE :search OR cms.slug ILIKE :search OR cms.content ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.isPublished !== undefined) {
      qb.andWhere('cms.isPublished = :isPublished', { isPublished: query.isPublished });
    }

    const allowedSortColumns: Record<string, string> = {
      title: 'cms.title',
      slug: 'cms.slug',
      createdAt: 'cms.createdAt',
      updatedAt: 'cms.updatedAt',
    };
    const sortColumn = allowedSortColumns[query.sortBy ?? 'updatedAt'] ?? 'cms.updatedAt';
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

  async create(dto: CreateCmsPageDto): Promise<CmsPage> {
    const slug = this.normalizeSlug(dto.slug);
    const existing = await this.cmsRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`A CMS page with slug "${slug}" already exists.`);
    }

    const entity = this.cmsRepository.create({
      ...dto,
      slug,
    });
    return this.cmsRepository.save(entity);
  }

  async update(id: string, dto: UpdateCmsPageDto): Promise<CmsPage> {
    const page = await this.cmsRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`CMS page with ID "${id}" not found.`);
    }

    if (dto.slug !== undefined) {
      const normalized = this.normalizeSlug(dto.slug);
      if (normalized !== page.slug) {
        const conflict = await this.cmsRepository.findOne({ where: { slug: normalized } });
        if (conflict) {
          throw new ConflictException(`A CMS page with slug "${normalized}" already exists.`);
        }
      }
      dto.slug = normalized;
    }

    Object.assign(page, dto);
    return this.cmsRepository.save(page);
  }

  async remove(id: string): Promise<{ message: string }> {
    const page = await this.cmsRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`CMS page with ID "${id}" not found.`);
    }

    await this.cmsRepository.remove(page);
    return { message: `CMS page "${page.slug}" deleted successfully.` };
  }
}
