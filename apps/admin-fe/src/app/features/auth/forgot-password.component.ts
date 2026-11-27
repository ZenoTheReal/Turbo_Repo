import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p class="text-sm text-slate-500">
            {{ step() === 'REQUEST' ? 'Enter your email to receive a 6-digit code' : 'Enter the code and your new password' }}
          </p>
        </div>

        @if (infoMessage()) {
          <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {{ infoMessage() }}
          </div>
        }
        @if (errorMessage()) {
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {{ errorMessage() }}
          </div>
        }

        @if (step() === 'REQUEST') {
          <form (ngSubmit)="requestCode()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer"
            >
              {{ loading() ? 'Sending...' : 'Send Reset Code' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="confirmReset()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                6-Digit OTP
              </label>
              <input
                type="text"
                [(ngModel)]="otp"
                name="otp"
                maxlength="6"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-center tracking-widest font-mono text-base"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                [(ngModel)]="newPassword"
                name="newPassword"
                minlength="6"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer"
            >
              {{ loading() ? 'Updating...' : 'Reset Password' }}
            </button>
          </form>
        }

        <div class="pt-3 border-t border-slate-100 text-center">
          <a routerLink="/auth/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  otp = '';
  newPassword = '';
  readonly step = signal<'REQUEST' | 'CONFIRM'>('REQUEST');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  requestCode(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.infoMessage.set(res.message || 'Reset code sent if account exists.');
        this.step.set('CONFIRM');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to send reset code.');
      },
    });
  }

  confirmReset(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService
      .resetPassword({
        email: this.email.trim(),
        otp: this.otp.trim(),
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to reset password.');
        },
      });
  }
}
