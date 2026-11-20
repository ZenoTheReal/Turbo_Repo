import { ProductStatus } from '@repo/common';

export interface QueryProductDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'sellingPrice' | 'title' | 'stockQuantity';
  sortOrder?: 'ASC' | 'DESC';
}
