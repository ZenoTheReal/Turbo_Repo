import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/services/admin-api.service';
import { AdminPlatformStats, Store } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Platform Statistics &amp; Overview</h2>
          <p class="text-sm text-slate-500">Real-time marketplace metrics across users, stores, CMS, and billing</p>
        </div>
        <div class="flex items-center gap-2">
          <a
            routerLink="/admin/cms"
            class="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage CMS &amp; Policies
          </a>
          <a
            routerLink="/admin/settings"
            class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            Platform Settings
          </a>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {{ errorMessage() }}
        </div>
      }

      <!-- Financial KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform GMV</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            {{ stats()?.billing?.totalGmv ?? 0 | currency }}
          </p>
          <p class="text-xs text-slate-500 mt-1">
            {{ stats()?.billing?.paidInvoiceCount ?? 0 }} paid invoices
          </p>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Commission Earned</p>
          <p class="text-2xl font-bold text-indigo-600 mt-1">
            {{ stats()?.billing?.totalCommissionEarned ?? 0 | currency }}
          </p>
          <p class="text-xs text-slate-500 mt-1">Platform revenue cut</p>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ stats()?.users?.total ?? 0 }}</p>
          <p class="text-xs text-slate-500 mt-1">
            {{ stats()?.users?.sellers ?? 0 }} Sellers · {{ stats()?.users?.buyers ?? 0 }} Buyers
          </p>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Storefronts</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats()?.stores?.active ?? 0 }} Active</p>
          <p class="text-xs text-slate-500 mt-1">
            {{ stats()?.stores?.pendingApproval ?? 0 }} pending · {{ stats()?.stores?.stripeReady ?? 0 }} Stripe-ready
          </p>
        </div>
      </div>

      <!-- Detailed Breakdown Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900">User Health</h3>
            <a routerLink="/admin/users" class="text-xs font-semibold text-indigo-600 hover:underline">Manage</a>
          </div>
          <div class="text-xs text-slate-600 space-y-1.5 pt-1">
            <div class="flex justify-between"><span>Active Accounts</span><strong>{{ stats()?.users?.active ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Email Verified</span><strong>{{ stats()?.users?.verified ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Suspended</span><strong class="text-rose-600">{{ stats()?.users?.suspended ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Admins</span><strong>{{ stats()?.users?.admins ?? 0 }}</strong></div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900">Storefront Pipeline</h3>
            <a routerLink="/admin/stores" class="text-xs font-semibold text-indigo-600 hover:underline">Manage</a>
          </div>
          <div class="text-xs text-slate-600 space-y-1.5 pt-1">
            <div class="flex justify-between"><span>Total Stores</span><strong>{{ stats()?.stores?.total ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Pending Approval</span><strong class="text-amber-600">{{ stats()?.stores?.pendingApproval ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Rejected</span><strong>{{ stats()?.stores?.rejected ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Suspended</span><strong>{{ stats()?.stores?.suspended ?? 0 }}</strong></div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900">Website Content (CMS &amp; FAQs)</h3>
            <a routerLink="/admin/faqs" class="text-xs font-semibold text-indigo-600 hover:underline">Manage</a>
          </div>
          <div class="text-xs text-slate-600 space-y-1.5 pt-1">
            <div class="flex justify-between"><span>Published FAQs</span><strong>{{ stats()?.faqs?.published ?? 0 }} / {{ stats()?.faqs?.total ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Published CMS Pages</span><strong>{{ stats()?.cms?.published ?? 0 }} / {{ stats()?.cms?.total ?? 0 }}</strong></div>
            <div class="flex justify-between"><span>Pending Payouts</span><strong class="text-amber-600">{{ stats()?.billing?.pendingPayoutAmount ?? 0 | currency }}</strong></div>
            <div class="flex justify-between"><span>Completed Payouts</span><strong>{{ stats()?.billing?.completedPayoutAmount ?? 0 | currency }}</strong></div>
          </div>
        </div>
      </div>

      <!-- Pending Store Approvals Queue -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Pending Store Applications</h3>
            <p class="text-xs text-slate-500">Merchants awaiting administrator approval</p>
          </div>
          <a routerLink="/admin/stores" class="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            View All Stores
          </a>
        </div>

        @if (loading()) {
          <div class="p-6 text-sm text-slate-500">Loading applications...</div>
        } @else if (pendingStores().length === 0) {
          <div class="p-6 text-sm text-slate-500">No pending store applications right now.</div>
        } @else {
          <div class="divide-y divide-slate-100">
            @for (store of pendingStores(); track store.id) {
              <div class="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ store.name }}</p>
                  <p class="text-xs text-slate-500">
                    Subdomain: <span class="font-mono text-indigo-600">{{ store.subdomain }}</span>
                    @if (store.contactEmail) {
                      · {{ store.contactEmail }}
                    }
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="approveStore(store.id)"
                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Approve Store
                  </button>
                  <a
                    routerLink="/admin/stores"
                    class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Inspect
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminOverviewComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly stats = signal<AdminPlatformStats | null>(null);
  readonly pendingStores = signal<Store[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.adminApi.getPlatformStats().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => this.errorMessage.set(err?.error?.message || 'Unable to load statistics.'),
    });

    this.adminApi.getStores({ status: 'PENDING_APPROVAL', limit: 5 }).subscribe({
      next: (res) => {
        this.pendingStores.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  approveStore(id: string): void {
    this.adminApi.updateStoreStatus(id, 'ACTIVE').subscribe({
      next: () => this.loadData(),
      error: (err) => this.errorMessage.set(err?.error?.message || 'Approval failed.'),
    });
  }
}
