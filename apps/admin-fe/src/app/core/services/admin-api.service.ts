import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AdminPlatformStats,
  AuthUser,
  CmsPage,
  Faq,
  FaqCategory,
  Invoice,
  PaginatedResponse,
  PlatformBillingSummary,
  PlatformSettings,
  SellerPayout,
  Store,
  StoreStatus,
  UserRole,
  UserStatus,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private buildParams(query: Record<string, any>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  // --- Platform Statistics & Billing ---
  getPlatformStats() {
    return this.http.get<AdminPlatformStats>(`${this.apiUrl}/admin/stats`);
  }

  getBillingSummary() {
    return this.http.get<PlatformBillingSummary>(`${this.apiUrl}/admin/billing/summary`);
  }

  getInvoices(query: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    return this.http.get<PaginatedResponse<Invoice>>(`${this.apiUrl}/admin/billing/invoices`, {
      params: this.buildParams(query),
    });
  }

  getPayouts(query: { page?: number; limit?: number; status?: string } = {}) {
    return this.http.get<PaginatedResponse<SellerPayout>>(`${this.apiUrl}/admin/billing/payouts`, {
      params: this.buildParams(query),
    });
  }

  markPayoutPaid(id: string, stripeTransferId?: string) {
    return this.http.patch<SellerPayout>(`${this.apiUrl}/admin/billing/payouts/${id}/pay`, {
      stripeTransferId,
    });
  }

  // --- Storefronts Management ---
  getStores(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      includeDeleted?: boolean;
    } = {},
  ) {
    return this.http.get<PaginatedResponse<Store>>(`${this.apiUrl}/admin/stores`, {
      params: this.buildParams(query),
    });
  }

  getStoreById(id: string) {
    return this.http.get<Store>(`${this.apiUrl}/admin/stores/${id}`);
  }

  updateStoreStatus(id: string, status: StoreStatus, reason?: string) {
    return this.http.patch<{ message: string; store: Store }>(
      `${this.apiUrl}/admin/stores/${id}/status`,
      { status, reason },
    );
  }

  // --- Users Management ---
  getUsers(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      role?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      includeDeleted?: boolean;
    } = {},
  ) {
    return this.http.get<PaginatedResponse<AuthUser>>(`${this.apiUrl}/users`, {
      params: this.buildParams(query),
    });
  }

  updateUserStatus(id: string, status: UserStatus) {
    return this.http.patch<AuthUser>(`${this.apiUrl}/users/${id}/status`, { status });
  }

  updateUserRole(id: string, role: UserRole) {
    return this.http.patch<AuthUser>(`${this.apiUrl}/users/${id}/role`, { role });
  }

  softDeleteUser(id: string) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`);
  }

  restoreUser(id: string) {
    return this.http.patch<AuthUser>(`${this.apiUrl}/users/${id}/restore`, {});
  }

  // --- FAQs Management ---
  getFaqs(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      category?: FaqCategory | '';
      isPublished?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ) {
    return this.http.get<PaginatedResponse<Faq>>(`${this.apiUrl}/admin/faqs`, {
      params: this.buildParams(query),
    });
  }

  createFaq(payload: Partial<Faq>) {
    return this.http.post<Faq>(`${this.apiUrl}/admin/faqs`, payload);
  }

  updateFaq(id: string, payload: Partial<Faq>) {
    return this.http.patch<Faq>(`${this.apiUrl}/admin/faqs/${id}`, payload);
  }

  deleteFaq(id: string) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/faqs/${id}`);
  }

  // --- CMS Pages (Terms, Privacy Policy, Legal) ---
  checkCmsSlug(slug: string, excludeId?: string) {
    return this.http.get<{ slug: string; available: boolean; reason?: string }>(
      `${this.apiUrl}/admin/cms/check-slug`,
      { params: this.buildParams({ slug, excludeId }) },
    );
  }

  getCmsPages(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      isPublished?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ) {
    return this.http.get<PaginatedResponse<CmsPage>>(`${this.apiUrl}/admin/cms`, {
      params: this.buildParams(query),
    });
  }

  createCmsPage(payload: Partial<CmsPage>) {
    return this.http.post<CmsPage>(`${this.apiUrl}/admin/cms`, payload);
  }

  updateCmsPage(id: string, payload: Partial<CmsPage>) {
    return this.http.patch<CmsPage>(`${this.apiUrl}/admin/cms/${id}`, payload);
  }

  deleteCmsPage(id: string) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/cms/${id}`);
  }

  // --- Platform Website & DB Settings ---
  getSettings() {
    return this.http.get<PlatformSettings>(`${this.apiUrl}/admin/settings`);
  }

  updateSettings(payload: Partial<PlatformSettings> & { logoKey?: string; faviconKey?: string }) {
    return this.http.patch<{ message: string; settings: PlatformSettings }>(
      `${this.apiUrl}/admin/settings`,
      payload,
    );
  }
}
