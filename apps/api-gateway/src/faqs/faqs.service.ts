import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { Faq } from './schema/faq.entity.js';
import { CreateFaqDto } from './dto/create-faq.dto.js';
import { UpdateFaqDto } from './dto/update-faq.dto.js';
import { FindFaqsQueryDto } from './dto/find-faqs-query.dto.js';

@Injectable()
export class FaqsService {
  private readonly faqRepository: Repository<Faq>;

  constructor(private readonly database: Database) {
    this.faqRepository = this.database.dataSource.getRepository(Faq);
  }

  async findPublic(query: FindFaqsQueryDto) {
    const qb = this.faqRepository
      .createQueryBuilder('faq')
      .where('faq.isPublished = :published', { published: true })
      .orderBy('faq.displayOrder', 'ASC')
      .addOrderBy('faq.createdAt', 'DESC');

    if (query.category) {
      qb.andWhere('faq.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(faq.question ILIKE :search OR faq.answer ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb.getMany();
  }

  async findAdmin(query: FindFaqsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.faqRepository.createQueryBuilder('faq');

    if (query.search) {
      qb.andWhere('(faq.question ILIKE :search OR faq.answer ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.category) {
      qb.andWhere('faq.category = :category', { category: query.category });
    }
    if (query.isPublished !== undefined) {
      qb.andWhere('faq.isPublished = :isPublished', { isPublished: query.isPublished });
    }

    const allowedSortColumns: Record<string, string> = {
      displayOrder: 'faq.displayOrder',
      createdAt: 'faq.createdAt',
      question: 'faq.question',
      category: 'faq.category',
    };
    const sortColumn = allowedSortColumns[query.sortBy ?? 'displayOrder'] ?? 'faq.displayOrder';
    const sortDirection = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    qb.orderBy(sortColumn, sortDirection).addOrderBy('faq.createdAt', 'DESC');
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

  async create(dto: CreateFaqDto): Promise<Faq> {
    const faq = this.faqRepository.create(dto);
    return this.faqRepository.save(faq);
  }

  async update(id: string, dto: UpdateFaqDto): Promise<Faq> {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID "${id}" not found.`);
    }

    Object.assign(faq, dto);
    return this.faqRepository.save(faq);
  }

  async remove(id: string): Promise<{ message: string }> {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ with ID "${id}" not found.`);
    }

    await this.faqRepository.remove(faq);
    return { message: 'FAQ deleted successfully.' };
  }
}
