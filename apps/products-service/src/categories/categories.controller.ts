import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CATEGORY_PATTERNS } from '@repo/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @MessagePattern(CATEGORY_PATTERNS.CREATE)
  async createCategory(@Payload() data: { storeId: string; dto: CreateCategoryDto }) {
    return this.categoriesService.createCategory(data.storeId, data.dto);
  }

  @MessagePattern(CATEGORY_PATTERNS.UPDATE)
  async updateCategory(@Payload() data: { storeId: string; id: string; dto: UpdateCategoryDto }) {
    return this.categoriesService.updateCategory(data.storeId, data.id, data.dto);
  }

  @MessagePattern(CATEGORY_PATTERNS.FIND_ALL)
  async findCategories(@Payload() data: { storeId: string; asTree?: boolean; includeInactive?: boolean }) {
    if (data.asTree) {
      return this.categoriesService.findCategoryTree(data.storeId);
    }
    return this.categoriesService.findCategories(data.storeId, data.includeInactive);
  }

  @MessagePattern(CATEGORY_PATTERNS.FIND_ONE)
  async findCategory(@Payload() data: { storeId: string; id: string }) {
    return this.categoriesService.findById(data.storeId, data.id);
  }

  @MessagePattern(CATEGORY_PATTERNS.DELETE)
  async deleteCategory(@Payload() data: { storeId: string; id: string }) {
    return this.categoriesService.deleteCategory(data.storeId, data.id);
  }
}
