import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { CmsPage, PaginationMeta } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-cms',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">CMS Pages (Terms, Privacy &amp; Policies)</h2>
          <p class="text-sm text-slate-500">Manage legal and informational website pages addressed by unique URL slugs</p>
        </div>

        <button
          type="button"
          (click)="openCreate()"
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
        >
          New CMS Page
        </button>
      </div>

      <!-- Search & Filter Bar -->
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          [(ngModel)]="search"
          (keyup.enter)="applyFilters()"
          placeholder="Search title, slug, or content..."
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-64"
        />
        <select
          [(ngModel)]="publishedFilter"
          (change)="applyFilters()"
          class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
        <button
          type="button"
          (click)="applyFilters()"
          class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
        >
          Search
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
        <form (ngSubmit)="savePage()" class="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-bold text-slate-900">
              {{ editingId() ? 'Edit CMS Page' : 'Create CMS Page' }}
            </h3>
            @if (!editingId()) {
              <div class="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  (click)="applyPreset('Terms and Conditions', 'terms-and-conditions')"
                  class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
                >
                  + Terms Preset
                </button>
                <button
                  type="button"
                  (click)="applyPreset('Privacy Policy', 'privacy-policy')"
                  class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
                >
                  + Privacy Preset
                </button>
                <button
                  type="button"
                  (click)="applyPreset('Refund & Return Policy', 'refund-policy')"
                  class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
                >
                  + Refund Preset
                </button>
              </div>
            }
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Page Title *</label>
              <input
                type="text"
                [(ngModel)]="form.title"
                (ngModelChange)="autoSlug()"
                name="title"
                required
                placeholder="Terms and Conditions"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Slug * (public URL key)</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="form.slug"
                  name="slug"
                  required
                  placeholder="terms-and-conditions"
                  class="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono lowercase"
                />
                <button
                  type="button"
                  (click)="checkSlug()"
                  class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Check Slug
                </button>
              </div>
              @if (slugStatus()) {
                <p
                  [class]="
                    'text-xs mt-1 ' + (slugAvailable() ? 'text-emerald-600' : 'text-rose-600')
                  "
                >
                  {{ slugStatus() }}
                </p>
              }
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Short Summary</label>
            <input
              type="text"
              [(ngModel)]="form.summary"
              name="summary"
              placeholder="Brief summary shown in SEO previews"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">
              Page Content * (HTML or Markdown)
            </label>
            <textarea
              [(ngModel)]="form.content"
              name="content"
              rows="8"
              required
              placeholder="<h2>1. Overview</h2><p>...</p>"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
            ></textarea>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">SEO Meta Title</label>
              <input
                type="text"
                [(ngModel)]="form.metaTitle"
                name="metaTitle"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">SEO Meta Description</label>
              <input
                type="text"
                [(ngModel)]="form.metaDescription"
                name="metaDescription"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" [(ngModel)]="form.isPublished" name="isPublished" />
            Published (accessible via GET /api/cms/{{ form.slug || 'slug' }})
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
              Save CMS Page
            </button>
          </div>
        </form>
      }

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('title')">
                Title {{ sortIndicator('title') }}
              </th>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('slug')">
                Slug {{ sortIndicator('slug') }}
              </th>
              <th class="px-5 py-3.5">Status</th>
              <th class="px-5 py-3.5 cursor-pointer select-none" (click)="toggleSort('updatedAt')">
                Last Updated {{ sortIndicator('updatedAt') }}
              </th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr>
                <td colspan="5" class="px-5 py-6 text-center text-slate-500">Loading CMS pages...</td>
              </tr>
            } @else if (pages().length === 0) {
              <tr>
                <td colspan="5" class="px-5 py-6 text-center text-slate-500">No CMS pages created yet.</td>
              </tr>
            } @else {
              @for (p of pages(); track p.id) {
                <tr class="hover:bg-slate-50/70">
                  <td class="px-5 py-4">
                    <p class="font-semibold text-slate-900">{{ p.title }}</p>
                    @if (p.summary) {
                      <p class="text-xs text-slate-500 truncate max-w-md">{{ p.summary }}</p>
                    }
                  </td>
                  <td class="px-5 py-4 font-mono text-xs text-indigo-600">/{{ p.slug }}</td>
                  <td class="px-5 py-4">
                    <button
                      type="button"
                      (click)="togglePublish(p)"
                      [class]="
                        p.isPublished
                          ? 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 cursor-pointer'
                          : 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 cursor-pointer'
                      "
                    >
                      {{ p.isPublished ? 'Published' : 'Draft' }}
                    </button>
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-500">{{ p.updatedAt | date: 'medium' }}</td>
                  <td class="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      (click)="openEdit(p)"
                      class="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      (click)="remove(p.id)"
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
            <span>Total: {{ meta()!.totalItems }} pages (Page {{ meta()!.currentPage }} of {{ meta()!.totalPages || 1 }})</span>
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
export class AdminCmsComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly loading = signal(true);
  readonly pages = signal<CmsPage[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly slugStatus = signal<string | null>(null);
  readonly slugAvailable = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  search = '';
  publishedFilter = '';
  sortBy = 'updatedAt';
  sortOrder: 'ASC' | 'DESC' = 'DESC';
  page = 1;
  limit = 20;

  form = {
    title: '',
    slug: '',
    summary: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    isPublished: true,
  };

  ngOnInit(): void {
    this.loadPages();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadPages();
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'ASC';
    }
    this.loadPages();
  }

  sortIndicator(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1) return;
    this.page = nextPage;
    this.loadPages();
  }

  loadPages(): void {
    this.loading.set(true);
    this.adminApi
      .getCmsPages({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        isPublished: this.publishedFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: (res) => {
          this.pages.set(res.data || []);
          this.meta.set(res.meta || null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Could not load CMS pages.');
        },
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.slugStatus.set(null);
    this.form = {
      title: '',
      slug: '',
      summary: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isPublished: true,
    };
    this.showForm.set(true);
  }

  openEdit(page: CmsPage): void {
    this.editingId.set(page.id);
    this.slugStatus.set(null);
    this.form = {
      title: page.title,
      slug: page.slug,
      summary: page.summary || '',
      content: page.content,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished,
    };
    this.showForm.set(true);
  }

  applyPreset(title: string, slug: string): void {
    this.form.title = title;
    this.form.slug = slug;
    this.form.content = `<h2>${title}</h2>\n<p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>\n<p>Replace this draft text with your official ${title.toLowerCase()}.</p>`;
    this.checkSlug();
  }

  autoSlug(): void {
    if (this.editingId()) return;
    this.form.slug = this.form.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  checkSlug(): void {
    if (!this.form.slug.trim()) return;
    this.adminApi.checkCmsSlug(this.form.slug.trim(), this.editingId() || undefined).subscribe({
      next: (res) => {
        this.slugAvailable.set(res.available);
        this.slugStatus.set(
          res.available ? `Slug "${res.slug}" is available.` : res.reason || 'Slug already taken.',
        );
      },
      error: (err) => {
        this.slugAvailable.set(false);
        this.slugStatus.set(err?.error?.message || 'Invalid slug format.');
      },
    });
  }

  savePage(): void {
    this.feedback.set(null);
    this.errorMessage.set(null);
    const id = this.editingId();
    const payload = {
      ...this.form,
      slug: this.form.slug.trim().toLowerCase(),
      summary: this.form.summary.trim() || undefined,
      metaTitle: this.form.metaTitle.trim() || undefined,
      metaDescription: this.form.metaDescription.trim() || undefined,
    };

    const req$ = id ? this.adminApi.updateCmsPage(id, payload) : this.adminApi.createCmsPage(payload);
    req$.subscribe({
      next: () => {
        this.showForm.set(false);
        this.feedback.set(id ? 'CMS page updated.' : 'CMS page published.');
        this.loadPages();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to save CMS page.'),
    });
  }

  togglePublish(page: CmsPage): void {
    this.adminApi.updateCmsPage(page.id, { isPublished: !page.isPublished }).subscribe({
      next: () => this.loadPages(),
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to update status.'),
    });
  }

  remove(id: string): void {
    if (!window.confirm('Delete this CMS page permanently?')) return;
    this.adminApi.deleteCmsPage(id).subscribe({
      next: (res) => {
        this.feedback.set(res.message);
        this.loadPages();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to delete CMS page.'),
    });
  }
}
