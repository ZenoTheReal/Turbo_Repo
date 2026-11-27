import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div class="text-center space-y-1">
          <div class="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">
            O
          </div>
          <h1 class="text-2xl font-bold text-slate-900">OmniStore Super Admin</h1>
          <p class="text-sm text-slate-500">
            Platform operations, CMS, FAQs, database settings &amp; statistics
          </p>
        </div>

        @if (errorMessage()) {
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Administrator Email
            </label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="admin@omnistore.com"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <a routerLink="/auth/forgot-password" class="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="Enter password"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer"
          >
            {{ loading() ? 'Authenticating...' : 'Sign In to Admin Console' }}
          </button>
        </form>

        <div class="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Restricted to platform Super Administrators. Buyers and Sellers sign in on the storefront app.
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email.trim(), this.password).subscribe({
      next: () => {
        if (this.authService.userRole() !== 'ADMIN') {
          this.authService.clearSession();
          this.errorMessage.set(
            'Access restricted to Super Administrators. Sellers and buyers must use the Next.js portal.',
          );
          this.loading.set(false);
          return;
        }
        this.router.navigate(['/admin/overview']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Invalid credentials. Please try again.');
      },
    });
  }
}
