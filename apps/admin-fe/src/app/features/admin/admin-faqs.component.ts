import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { Faq, FaqCategory, PaginationMeta } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-faqs',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">FAQs Management</h2>
          <p class="text-sm text-slate-500">Manage frequently asked questions displayed on the public website</p>
        </div>

        <button
          type="button"
          (click)="openCreate()"
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
        >
          New FAQ
        </button>
      </div>

      <!-- Search, Filter & Sort Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          [(ngModel)]="search"
          (keyup.enter)="applyFilters()"
          placeholder="Search question or answer..."
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-64"
        />
        <select
          [(ngModel)]="categoryFilter"
          (change)="applyFilters()"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
        >
          <option value="">All Categories</option>
          <option value="GENERAL">GENERAL</option>
          <option value="BUYERS">BUYERS</option>
          <option value="SELLERS">SELLERS</option>
          <option value="PAYMENTS">PAYMENTS</option>
          <option value="SHIPPING">SHIPPING</option>
        </select>
        <select
          [(ngModel)]="publishedFilter"
          (change)="applyFilters()"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
        >
          <option value="">All Visibility</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
        <button
          type="button"
          (click)="applyFilters()"
          class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
        >
          Filter
        </button>
      </div>

      @if (feedback()) {
        <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          {{ feedback() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {{ errorMessage() }}
        </div>
      }

      @if (showForm()) {
        <form (ngSubmit)="saveFaq()" class="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-900">
            {{ editingId() ? 'Edit FAQ' : 'Create FAQ' }}
          </h3>

          <div class="grid sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Question *</label>
              <input
                type="text"
                [(ngModel)]="form.question"
                name="question"
                required
                placeholder="How do I request a payout?"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  [(ngModel)]="form.category"
                  name="category"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="BUYERS">BUYERS</option>
                  <option value="SELLERS">SELLERS</option>
                  <option value="PAYMENTS">PAYMENTS</option>
                  <option value="SHIPPING">SHIPPING</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Order</label>
                <input
                  type="number"
                  min="0"
                  [(ngModel)]="form.displayOrder"
                  name="displayOrder"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Answer *</label>
            <textarea
              [(ngModel)]="form.answer"
              name="answer"
              rows="4"
              required
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            ></textarea>
          </div>

          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" [(ngModel)]="form.isPublished" name="isPublished" />
            Published on website
          </label>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              (click)="showForm.set(false)"
              class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              Save FAQ
            </button>
          </div>
        </form>
      }

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('displayOrder')">
                Order {{ sortIndicator('displayOrder') }}
              </th>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('question')">
                Question {{ sortIndicator('question') }}
              </th>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('category')">
                Category {{ sortIndicator('category') }}
              </th>
              <th class="px-5 py-3.5">Status</th>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('createdAt')">
                Created {{ sortIndicator('createdAt') }}
              </th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr>
                <td colspan="6" class="px-5 py-6 text-center text-slate-500">Loading FAQs...</td>
              </tr>
            } @else if (faqs().length === 0) {
              <tr>
                <td colspan="6" class="px-5 py-6 text-center text-slate-500">No FAQs found.</td>
              </tr>
            } @else {
              @for (faq of faqs(); track faq.id) {
                <tr class="hover:bg-slate-50/70">
                  <td class="px-5 py-4 font-mono text-xs text-slate-500">{{ faq.displayOrder }}</td>
                  <td class="px-5 py-4 max-w-md">
                    <p class="font-semibold text-slate-900">{{ faq.question }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ faq.answer }}</p>
                  </td>
                  <td class="px-5 py-4 text-xs font-semibold text-indigo-700">{{ faq.category }}</td>
                  <td class="px-5 py-4">
                    <button
                      type="button"
                      (click)="togglePublish(faq)"
                      [class]="
                        faq.isPublished
                          ? 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 cursor-pointer'
                          : 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 cursor-pointer'
                      "
                    >
                      {{ faq.isPublished ? 'Published' : 'Draft' }}
                    </button>
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-500">{{ faq.createdAt | date: 'mediumDate' }}</td>
                  <td class="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      (click)="openEdit(faq)"
                      class="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      (click)="remove(faq.id)"
                      class="px-2.5 py-1 rounded border border-rose-300 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (meta()) {
          <div class="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Total: {{ meta()!.totalItems }} FAQs (Page {{ meta()!.currentPage }} of {{ meta()!.totalPages || 1 }})</span>
            <div class="flex gap-2">
              <button
                type="button"
                [disabled]="!meta()!.hasPreviousPage"
                (click)="goToPage(page - 1)"
                class="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                [disabled]="!meta()!.hasNextPage"
                (click)="goToPage(page + 1)"
                class="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminFaqsComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly loading = signal(true);
  readonly faqs = signal<Faq[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  search = '';
  categoryFilter: FaqCategory | '' = '';
  publishedFilter = '';
  sortBy = 'displayOrder';
  sortOrder: 'ASC' | 'DESC' = 'ASC';
  page = 1;
  limit = 20;

  form: {
    question: string;
    answer: string;
    category: FaqCategory;
    displayOrder: number;
    isPublished: boolean;
  } = {
    question: '',
    answer: '',
    category: 'GENERAL',
    displayOrder: 0,
    isPublished: true,
  };

  ngOnInit(): void {
    this.loadFaqs();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadFaqs();
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'ASC';
    }
    this.loadFaqs();
  }

  sortIndicator(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1) return;
    this.page = nextPage;
    this.loadFaqs();
  }

  loadFaqs(): void {
    this.loading.set(true);
    this.adminApi
      .getFaqs({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        category: this.categoryFilter || undefined,
        isPublished: this.publishedFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: (res) => {
          this.faqs.set(res.data || []);
          this.meta.set(res.meta || null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Could not load FAQs.');
        },
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = { question: '', answer: '', category: 'GENERAL', displayOrder: 0, isPublished: true };
    this.showForm.set(true);
  }

  openEdit(faq: Faq): void {
    this.editingId.set(faq.id);
    this.form = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      displayOrder: faq.displayOrder,
      isPublished: faq.isPublished,
    };
    this.showForm.set(true);
  }

  saveFaq(): void {
    this.feedback.set(null);
    this.errorMessage.set(null);
    const id = this.editingId();
    const payload = {
      ...this.form,
      displayOrder: Number(this.form.displayOrder || 0),
    };

    const req$ = id ? this.adminApi.updateFaq(id, payload) : this.adminApi.createFaq(payload);
    req$.subscribe({
      next: () => {
        this.showForm.set(false);
        this.feedback.set(id ? 'FAQ updated.' : 'FAQ created.');
        this.loadFaqs();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to save FAQ.'),
    });
  }

  togglePublish(faq: Faq): void {
    this.adminApi.updateFaq(faq.id, { isPublished: !faq.isPublished }).subscribe({
      next: () => this.loadFaqs(),
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to toggle visibility.'),
    });
  }

  remove(id: string): void {
    if (!window.confirm('Delete this FAQ permanently?')) return;
    this.adminApi.deleteFaq(id).subscribe({
      next: () => {
        this.feedback.set('FAQ deleted.');
        this.loadFaqs();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Delete failed.'),
    });
  }
}
