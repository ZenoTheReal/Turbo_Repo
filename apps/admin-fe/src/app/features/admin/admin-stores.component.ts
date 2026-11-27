import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { PaginationMeta, Store, StoreStatus } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Storefronts &amp; Approvals</h2>
          <p class="text-sm text-slate-500">Review, search, filter, sort, approve, or suspend merchant storefronts</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            type="text"
            [(ngModel)]="search"
            (keyup.enter)="applyFilters()"
            placeholder="Search store, subdomain, owner..."
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-64"
          />
          <select
            [(ngModel)]="statusFilter"
            (change)="applyFilters()"
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <button
            type="button"
            (click)="applyFilters()"
            class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Search
          </button>
        </div>
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

      @if (inspectedStore()) {
        <div class="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">{{ inspectedStore()!.name }}</h3>
              <p class="text-xs font-mono text-indigo-600">{{ inspectedStore()!.subdomain }}</p>
            </div>
            <button
              type="button"
              (click)="inspectedStore.set(null)"
              class="px-3 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
          <div class="grid sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div>
              <p class="font-semibold text-slate-400 uppercase">Legal Business</p>
              <p class="mt-1">{{ inspectedStore()!.legalBusinessName || '-' }}</p>
              <p class="text-slate-500">Tax ID: {{ inspectedStore()!.taxId || '-' }}</p>
            </div>
            <div>
              <p class="font-semibold text-slate-400 uppercase">Contact &amp; Location</p>
              <p class="mt-1">{{ inspectedStore()!.contactEmail || '-' }}</p>
              <p class="text-slate-500">
                {{ inspectedStore()!.city || '' }} {{ inspectedStore()!.country || '' }}
              </p>
            </div>
            <div>
              <p class="font-semibold text-slate-400 uppercase">Stripe Account</p>
              <p class="mt-1 font-mono">{{ inspectedStore()!.stripeAccountId || 'Not connected' }}</p>
              <p class="text-slate-500">Payouts: {{ inspectedStore()!.isPayoutsEnabled ? 'Enabled' : 'Disabled' }}</p>
            </div>
          </div>
          @if (inspectedStore()!.description) {
            <p class="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">{{ inspectedStore()!.description }}</p>
          }
        </div>
      }

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('name')">
                Storefront {{ sortIndicator('name') }}
              </th>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('subdomain')">
                Subdomain {{ sortIndicator('subdomain') }}
              </th>
              <th class="px-5 py-3.5">Contact</th>
              <th class="px-5 py-3.5">Stripe</th>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('status')">
                Status {{ sortIndicator('status') }}
              </th>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('createdAt')">
                Created {{ sortIndicator('createdAt') }}
              </th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr>
                <td colspan="7" class="px-5 py-6 text-center text-slate-500">Loading storefronts...</td>
              </tr>
            } @else if (stores().length === 0) {
              <tr>
                <td colspan="7" class="px-5 py-6 text-center text-slate-500">No storefronts found.</td>
              </tr>
            } @else {
              @for (store of stores(); track store.id) {
                <tr class="hover:bg-slate-50/70">
                  <td class="px-5 py-4 font-semibold text-slate-900">{{ store.name }}</td>
                  <td class="px-5 py-4 font-mono text-xs text-indigo-600">{{ store.subdomain }}</td>
                  <td class="px-5 py-4 text-slate-600 text-xs">
                    <p>{{ store.contactEmail || '-' }}</p>
                    <p class="text-slate-400">{{ store.country || 'US' }} · {{ store.currency || 'USD' }}</p>
                  </td>
                  <td class="px-5 py-4">
                    @if (store.isPayoutsEnabled) {
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Enabled
                      </span>
                    } @else {
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Pending
                      </span>
                    }
                  </td>
                  <td class="px-5 py-4">
                    <span [class]="statusBadge(store.status)">{{ store.status }}</span>
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-500">
                    {{ store.createdAt | date: 'mediumDate' }}
                  </td>
                  <td class="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      (click)="inspectedStore.set(store)"
                      class="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      View
                    </button>
                    @if (store.status !== 'ACTIVE') {
                      <button
                        type="button"
                        (click)="updateStatus(store.id, 'ACTIVE')"
                        class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                    }
                    @if (store.status === 'PENDING_APPROVAL') {
                      <button
                        type="button"
                        (click)="rejectStore(store)"
                        class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    }
                    @if (store.status === 'ACTIVE') {
                      <button
                        type="button"
                        (click)="updateStatus(store.id, 'SUSPENDED')"
                        class="px-2.5 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold cursor-pointer"
                      >
                        Suspend
                      </button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (meta()) {
          <div class="px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {{ stores().length }} of {{ meta()!.totalItems }} stores (Page {{ meta()!.currentPage }} of {{ meta()!.totalPages || 1 }})
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="!meta()!.hasPreviousPage"
                (click)="goToPage(page - 1)"
                class="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                [disabled]="!meta()!.hasNextPage"
                (click)="goToPage(page + 1)"
                class="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
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
export class AdminStoresComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly loading = signal(true);
  readonly stores = signal<Store[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly inspectedStore = signal<Store | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  search = '';
  statusFilter = '';
  sortBy = 'createdAt';
  sortOrder: 'ASC' | 'DESC' = 'DESC';
  page = 1;
  limit = 10;

  ngOnInit(): void {
    this.loadStores();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadStores();
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'ASC';
    }
    this.loadStores();
  }

  sortIndicator(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1) return;
    this.page = nextPage;
    this.loadStores();
  }

  loadStores(): void {
    this.loading.set(true);
    this.adminApi
      .getStores({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        status: this.statusFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: (res) => {
          this.stores.set(res.data || []);
          this.meta.set(res.meta || null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to load stores.');
        },
      });
  }

  updateStatus(id: string, status: StoreStatus, reason?: string): void {
    this.feedback.set(null);
    this.errorMessage.set(null);
    this.adminApi.updateStoreStatus(id, status, reason).subscribe({
      next: (res) => {
        this.feedback.set(res.message);
        this.loadStores();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to update store status.'),
    });
  }

  rejectStore(store: Store): void {
    const reason = window.prompt(`Reason for rejecting "${store.name}":`, 'Incomplete business details');
    if (reason === null) return;
    this.updateStatus(store.id, 'REJECTED', reason);
  }

  statusBadge(status: StoreStatus): string {
    const base = 'px-2.5 py-1 rounded-full text-xs font-semibold ';
    switch (status) {
      case 'ACTIVE':
        return base + 'bg-emerald-100 text-emerald-700';
      case 'PENDING_APPROVAL':
        return base + 'bg-amber-100 text-amber-800';
      case 'REJECTED':
        return base + 'bg-rose-100 text-rose-700';
      case 'SUSPENDED':
        return base + 'bg-slate-200 text-slate-700';
    }
  }
}
