import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../core/services/admin-api.service';
import { UploadService } from '../../core/services/upload.service';
import { PlatformSettings } from '../../core/models/api.models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-3xl space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Website &amp; Database Settings</h2>
        <p class="text-sm text-slate-500">
          Global platform branding, contact details, commission fees, and Stripe gateway settings
        </p>
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

      @if (loading()) {
        <div class="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          Loading platform settings...
        </div>
      } @else {
        <form (ngSubmit)="save()" class="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <!-- Branding -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">Branding &amp; Contact</h3>

            <div class="grid sm:grid-cols-2 gap-4">
              <div class="flex items-center gap-4 p-3 rounded-lg border border-slate-200">
                @if (logoPreview() || form.logoUrl) {
                  <img
                    [src]="logoPreview() || form.logoUrl"
                    alt="Platform Logo"
                    class="w-12 h-12 rounded-lg object-contain border border-slate-200 p-1"
                  />
                }
                <label class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <span>Upload Logo</span>
                  <input type="file" accept="image/*" class="hidden" (change)="uploadAsset($event, 'logo')" />
                </label>
              </div>

              <div class="flex items-center gap-4 p-3 rounded-lg border border-slate-200">
                @if (faviconPreview() || form.faviconUrl) {
                  <img
                    [src]="faviconPreview() || form.faviconUrl"
                    alt="Favicon"
                    class="w-10 h-10 rounded object-contain border border-slate-200 p-1"
                  />
                }
                <label class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <span>Upload Favicon</span>
                  <input type="file" accept="image/*" class="hidden" (change)="uploadAsset($event, 'favicon')" />
                </label>
              </div>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Platform Name</label>
                <input
                  type="text"
                  [(ngModel)]="form.platformName"
                  name="platformName"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Default Currency</label>
                <input
                  type="text"
                  [(ngModel)]="form.currency"
                  name="currency"
                  maxlength="10"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm uppercase"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Website URL</label>
                <input
                  type="url"
                  [(ngModel)]="form.websiteUrl"
                  name="websiteUrl"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Support Email</label>
                <input
                  type="email"
                  [(ngModel)]="form.contactEmail"
                  name="contactEmail"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Support Phone</label>
                <input
                  type="text"
                  [(ngModel)]="form.contactPhone"
                  name="contactPhone"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <hr class="border-slate-200" />

          <!-- Commission & Fees -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Marketplace Commission &amp; Fees
            </h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  [(ngModel)]="form.commissionRate"
                  name="commissionRate"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">
                  Fixed Fee Per Order
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  [(ngModel)]="form.fixedFee"
                  name="fixedFee"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <hr class="border-slate-200" />

          <!-- Stripe Gateway Config -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Stripe Payment Gateway
              </h3>
              <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" [(ngModel)]="form.isStripeEnabled" name="isStripeEnabled" />
                Stripe Payments Enabled
              </label>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Platform Stripe Account ID</label>
                <input
                  type="text"
                  [(ngModel)]="form.stripeAccountId"
                  name="stripeAccountId"
                  placeholder="acct_..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Stripe Publishable Key</label>
                <input
                  type="text"
                  [(ngModel)]="form.stripePublishableKey"
                  name="stripePublishableKey"
                  placeholder="pk_test_..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="saving()"
              class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
            >
              {{ saving() ? 'Saving...' : 'Save Platform Settings' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class AdminSettingsComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly uploadService = inject(UploadService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly logoPreview = signal<string | null>(null);
  readonly faviconPreview = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  form: Partial<PlatformSettings> & { logoKey?: string; faviconKey?: string } = {
    platformName: 'OmniStore',
    currency: 'USD',
    commissionRate: 0,
    fixedFee: 0,
    isStripeEnabled: false,
  };

  ngOnInit(): void {
    this.adminApi.getSettings().subscribe({
      next: (settings) => {
        this.form = { ...settings };
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Could not load settings.');
      },
    });
  }

  uploadAsset(event: Event, kind: 'logo' | 'favicon'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadService.uploadFile(file).subscribe({
      next: (res) => {
        if (kind === 'logo') {
          this.form.logoKey = res.fileKey;
          this.logoPreview.set(res.publicUrl);
        } else {
          this.form.faviconKey = res.fileKey;
          this.faviconPreview.set(res.publicUrl);
        }
      },
      error: (err) => this.errorMessage.set(err?.error?.message || 'Upload failed.'),
    });
  }

  save(): void {
    this.saving.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.adminApi
      .updateSettings({
        platformName: this.form.platformName,
        currency: this.form.currency,
        contactEmail: this.form.contactEmail || undefined,
        contactPhone: this.form.contactPhone || undefined,
        websiteUrl: this.form.websiteUrl || undefined,
        commissionRate: Number(this.form.commissionRate || 0),
        fixedFee: Number(this.form.fixedFee || 0),
        logoKey: this.form.logoKey,
        faviconKey: this.form.faviconKey,
        stripeAccountId: this.form.stripeAccountId || undefined,
        stripePublishableKey: this.form.stripePublishableKey || undefined,
        isStripeEnabled: Boolean(this.form.isStripeEnabled),
      })
      .subscribe({
        next: (res) => {
          this.form = { ...res.settings };
          this.saving.set(false);
          this.feedback.set(res.message);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to save settings.');
        },
      });
  }
}
