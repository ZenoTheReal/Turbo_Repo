import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-3xl space-y-6">
      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Profile Information</h2>
          <p class="text-sm text-slate-500">Update your personal details and profile photo</p>
        </div>

        @if (profileMessage()) {
          <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {{ profileMessage() }}
          </div>
        }
        @if (profileError()) {
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {{ profileError() }}
          </div>
        }

        <div class="flex items-center gap-4">
          @if (avatarPreview() || authService.currentUser()?.avatarUrl) {
            <img
              [src]="avatarPreview() || authService.currentUser()?.avatarUrl"
              alt="Profile Avatar"
              class="w-16 h-16 rounded-full object-cover border border-slate-200"
            />
          } @else {
            <div class="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600">
              {{ (name || 'U').slice(0, 2).toUpperCase() }}
            </div>
          }
          <div>
            <label class="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <span>{{ uploadingAvatar() ? 'Uploading to S3...' : 'Upload New Photo' }}</span>
              <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)" />
            </label>
            <p class="text-xs text-slate-400 mt-1">Direct presigned upload to Supabase S3</p>
          </div>
        </div>

        <form (ngSubmit)="saveProfile()" class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              [(ngModel)]="name"
              name="name"
              required
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
            <input
              type="text"
              [(ngModel)]="phoneNumber"
              name="phoneNumber"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              [disabled]="savingProfile()"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
            >
              {{ savingProfile() ? 'Saving...' : 'Save Profile' }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Change Password</h2>
          <p class="text-sm text-slate-500">Rotate your credentials regularly to keep your account secure</p>
        </div>

        @if (passwordMessage()) {
          <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {{ passwordMessage() }}
          </div>
        }
        @if (passwordError()) {
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {{ passwordError() }}
          </div>
        }

        <form (ngSubmit)="changePassword()" class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
            <input
              type="password"
              [(ngModel)]="currentPassword"
              name="currentPassword"
              required
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
            <input
              type="password"
              [(ngModel)]="newPassword"
              name="newPassword"
              required
              minlength="6"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              [disabled]="savingPassword()"
              class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
            >
              {{ savingPassword() ? 'Updating...' : 'Update Password' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  readonly authService = inject(AuthService);
  private readonly uploadService = inject(UploadService);

  name = this.authService.currentUser()?.name || '';
  phoneNumber = this.authService.currentUser()?.phoneNumber || '';
  avatarKey?: string;

  currentPassword = '';
  newPassword = '';

  readonly uploadingAvatar = signal(false);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly avatarPreview = signal<string | null>(null);
  readonly profileMessage = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.profileError.set(null);
    this.uploadService.uploadFile(file).subscribe({
      next: (res) => {
        this.avatarKey = res.fileKey;
        this.avatarPreview.set(res.publicUrl);
        this.uploadingAvatar.set(false);
      },
      error: (err) => {
        this.uploadingAvatar.set(false);
        this.profileError.set(err?.error?.message || 'Failed to upload photo.');
      },
    });
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileMessage.set(null);
    this.profileError.set(null);

    this.authService
      .updateProfile({
        name: this.name.trim(),
        phoneNumber: this.phoneNumber.trim() || undefined,
        avatarKey: this.avatarKey,
      })
      .subscribe({
        next: (res) => {
          this.savingProfile.set(false);
          this.avatarKey = undefined;
          this.profileMessage.set(res.message || 'Profile saved.');
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.profileError.set(err?.error?.message || 'Could not update profile.');
        },
      });
  }

  changePassword(): void {
    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.savingPassword.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.passwordMessage.set(res.message || 'Password updated.');
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(err?.error?.message || 'Could not change password.');
      },
    });
  }
}
