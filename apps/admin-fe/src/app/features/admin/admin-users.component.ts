import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { AuthUser, PaginationMeta, UserRole, UserStatus } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Users Directory</h2>
          <p class="text-sm text-slate-500">Search, filter, sort, manage roles, and soft-delete/restore accounts</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            type="text"
            [(ngModel)]="search"
            (keyup.enter)="applyFilters()"
            placeholder="Search name or email..."
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-56"
          />
          <select
            [(ngModel)]="roleFilter"
            (change)="applyFilters()"
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="">All Roles (Sellers &amp; Buyers)</option>
            <option value="SELLER">SELLER</option>
            <option value="BUYER">BUYER</option>
          </select>
          <select
            [(ngModel)]="statusFilter"
            (change)="applyFilters()"
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <label class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="includeDeleted" (change)="applyFilters()" />
            Show Deleted
          </label>
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

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('name')">
                User {{ sortIndicator('name') }}
              </th>
              <th class="px-5 py-3.5">Role</th>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('status')">
                Status {{ sortIndicator('status') }}
              </th>
              <th class="px-5 py-3.5">Verified</th>
              <th class="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" (click)="toggleSort('createdAt')">
                Joined {{ sortIndicator('createdAt') }}
              </th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr>
                <td colspan="6" class="px-5 py-6 text-center text-slate-500">Loading users...</td>
              </tr>
            } @else if (users().length === 0) {
              <tr>
                <td colspan="6" class="px-5 py-6 text-center text-slate-500">No users matched.</td>
              </tr>
            } @else {
              @for (user of users(); track user.id) {
                <tr [class]="user.isDeleted ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'">
                  <td class="px-5 py-4">
                    <p class="font-semibold text-slate-900">{{ user.name }}</p>
                    <p class="text-xs text-slate-500">{{ user.email }}</p>
                  </td>
                  <td class="px-5 py-4">
                    <select
                      [ngModel]="getRoleName(user)"
                      (ngModelChange)="changeRole(user.id, $event)"
                      class="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium"
                    >
                      <option value="SELLER">SELLER</option>
                      <option value="BUYER">BUYER</option>
                    </select>
                  </td>
                  <td class="px-5 py-4">
                    <select
                      [ngModel]="user.status"
                      (ngModelChange)="changeStatus(user.id, $event)"
                      class="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </td>
                  <td class="px-5 py-4 text-xs">
                    {{ user.isEmailVerified ? 'Yes' : 'Pending OTP' }}
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-500">
                    {{ user.createdAt | date: 'mediumDate' }}
                  </td>
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    @if (user.isDeleted) {
                      <button
                        type="button"
                        (click)="restoreUser(user.id)"
                        class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Restore
                      </button>
                    } @else {
                      <button
                        type="button"
                        (click)="softDelete(user.id)"
                        class="px-2.5 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                      >
                        Soft Delete
                      </button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <!-- Pagination Bar -->
        @if (meta()) {
          <div class="px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {{ users().length }} of {{ meta()!.totalItems }} users (Page {{ meta()!.currentPage }} of {{ meta()!.totalPages || 1 }})
            </span>
            <div class="flex items-center gap-2">
              <select
                [(ngModel)]="limit"
                (change)="applyFilters()"
                class="px-2 py-1 rounded border border-slate-300 bg-white"
              >
                <option [ngValue]="10">10 / page</option>
                <option [ngValue]="20">20 / page</option>
                <option [ngValue]="50">50 / page</option>
              </select>
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
export class AdminUsersComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly loading = signal(true);
  readonly users = signal<AuthUser[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  search = '';
  roleFilter = '';
  statusFilter = '';
  includeDeleted = false;
  sortBy = 'createdAt';
  sortOrder: 'ASC' | 'DESC' = 'DESC';
  page = 1;
  limit = 10;

  ngOnInit(): void {
    this.loadUsers();
  }

  getRoleName(user: AuthUser): UserRole {
    return typeof user.role === 'string' ? user.role : user.role?.name;
  }

  applyFilters(): void {
    this.page = 1;
    this.loadUsers();
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'ASC';
    }
    this.loadUsers();
  }

  sortIndicator(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1) return;
    this.page = nextPage;
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.adminApi
      .getUsers({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        role: this.roleFilter || undefined,
        status: this.statusFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        includeDeleted: this.includeDeleted,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data || []);
          this.meta.set(res.meta || null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to load users.');
        },
      });
  }

  changeRole(id: string, role: UserRole): void {
    this.adminApi.updateUserRole(id, role).subscribe({
      next: () => {
        this.feedback.set('User role updated.');
        this.loadUsers();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to change role.'),
    });
  }

  changeStatus(id: string, status: UserStatus): void {
    this.adminApi.updateUserStatus(id, status).subscribe({
      next: () => {
        this.feedback.set('User status updated.');
        this.loadUsers();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to change status.'),
    });
  }

  softDelete(id: string): void {
    this.adminApi.softDeleteUser(id).subscribe({
      next: (res) => {
        this.feedback.set(res.message);
        this.loadUsers();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Could not delete user.'),
    });
  }

  restoreUser(id: string): void {
    this.adminApi.restoreUser(id).subscribe({
      next: () => {
        this.feedback.set('User account restored.');
        this.loadUsers();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Could not restore user.'),
    });
  }
}
