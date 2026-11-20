import { OrderStatus } from '@repo/common';

export interface QueryOrdersDto {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}
