import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/services/admin-api.service';
import { Invoice, SellerPayout } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-billing',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Platform Billing &amp; Payouts</h2>
          <p class="text-sm text-slate-500">Search invoices, filter payouts, and settle seller withdrawals</p>
        </div>

        <div class="inline-flex rounded-lg bg-slate-200 p-1 text-xs font-semibold">
          <button
            type="button"
            (click)="tab.set('PAYOUTS')"
            [class]="tab() === 'PAYOUTS' ? 'px-3 py-1.5 rounded-md bg-white text-slate-900 shadow-sm' : 'px-3 py-1.5 text-slate-600 cursor-pointer'"
          >
            Seller Payouts
          </button>
          <button
            type="button"
            (click)="tab.set('INVOICES')"
            [class]="tab() === 'INVOICES' ? 'px-3 py-1.5 rounded-md bg-white text-slate-900 shadow-sm' : 'px-3 py-1.5 text-slate-600 cursor-pointer'"
          >
            All Invoices
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

      @if (tab() === 'PAYOUTS') {
        <div class="flex gap-2">
          <select
            [(ngModel)]="payoutStatusFilter"
            (change)="loadPayouts()"
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="">All Payout Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-5 py-3.5">Reference</th>
                <th class="px-5 py-3.5">Store ID</th>
                <th class="px-5 py-3.5">Amount</th>
                <th class="px-5 py-3.5">Status</th>
                <th class="px-5 py-3.5">Requested</th>
                <th class="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (payouts().length === 0) {
                <tr>
                  <td colspan="6" class="px-5 py-6 text-center text-slate-500">No payout requests yet.</td>
                </tr>
              } @else {
                @for (p of payouts(); track p.id) {
                  <tr>
                    <td class="px-5 py-4 font-mono text-xs font-semibold text-slate-800">
                      {{ p.payoutReference }}
                    </td>
                    <td class="px-5 py-4 font-mono text-xs text-slate-500">{{ p.storeId }}</td>
                    <td class="px-5 py-4 font-semibold text-slate-900">
                      {{ p.amount | currency: p.currency }}
                    </td>
                    <td class="px-5 py-4">
                      <span
                        [class]="
                          p.status === 'PAID'
                            ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700'
                            : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800'
                        "
                      >
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-500">
                      {{ p.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-5 py-4 text-right">
                      @if (p.status !== 'PAID') {
                        <button
                          type="button"
                          (click)="markPaid(p)"
                          class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400">Settled</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="invoiceSearch"
            (keyup.enter)="loadInvoices()"
            placeholder="Search invoice #, order #, or buyer..."
            class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm w-64"
          />
          <button
            type="button"
            (click)="loadInvoices()"
            class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Search
          </button>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-5 py-3.5">Invoice</th>
                <th class="px-5 py-3.5">Order</th>
                <th class="px-5 py-3.5">Gross</th>
                <th class="px-5 py-3.5">Platform Fee</th>
                <th class="px-5 py-3.5">Seller Net</th>
                <th class="px-5 py-3.5">Status</th>
                <th class="px-5 py-3.5">Issued</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (invoices().length === 0) {
                <tr>
                  <td colspan="7" class="px-5 py-6 text-center text-slate-500">No invoices issued yet.</td>
                </tr>
              } @else {
                @for (inv of invoices(); track inv.id) {
                  <tr>
                    <td class="px-5 py-4 font-mono text-xs font-semibold">{{ inv.invoiceNumber }}</td>
                    <td class="px-5 py-4 font-mono text-xs text-slate-600">{{ inv.orderNumber }}</td>
                    <td class="px-5 py-4">{{ inv.grossAmount | currency: inv.currency }}</td>
                    <td class="px-5 py-4 font-semibold text-indigo-600">
                      {{ inv.platformFeeAmount | currency: inv.currency }}
                    </td>
                    <td class="px-5 py-4 font-semibold text-emerald-700">
                      {{ inv.sellerNetAmount | currency: inv.currency }}
                    </td>
                    <td class="px-5 py-4">
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {{ inv.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-500">{{ inv.issuedAt | date: 'short' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminBillingComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  readonly tab = signal<'PAYOUTS' | 'INVOICES'>('PAYOUTS');
  readonly payouts = signal<SellerPayout[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  payoutStatusFilter = '';
  invoiceSearch = '';

  ngOnInit(): void {
    this.loadPayouts();
    this.loadInvoices();
  }

  loadPayouts(): void {
    this.adminApi
      .getPayouts({ limit: 50, status: this.payoutStatusFilter || undefined })
      .subscribe({
        next: (res) => this.payouts.set(res.data || []),
        error: (err) => this.errorMessage.set(err?.error?.message || 'Could not load payouts.'),
      });
  }

  loadInvoices(): void {
    this.adminApi
      .getInvoices({ limit: 50, search: this.invoiceSearch.trim() || undefined })
      .subscribe({
        next: (res) => this.invoices.set(res.data || []),
        error: () => {},
      });
  }

  markPaid(payout: SellerPayout): void {
    const transferId = window.prompt(
      `Optional Stripe Transfer ID for ${payout.payoutReference}:`,
      '',
    );
    if (transferId === null) return;

    this.adminApi.markPayoutPaid(payout.id, transferId || undefined).subscribe({
      next: () => {
        this.feedback.set(`Marked ${payout.payoutReference} as PAID.`);
        this.loadPayouts();
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Failed to mark payout paid.'),
    });
  }
}
