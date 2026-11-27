import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      @if (mobileMenuOpen()) {
        <div
          class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          (click)="mobileMenuOpen.set(false)"
        ></div>
      }

      <!-- Sidebar -->
      <aside
        [class]="
          'fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ' +
          (mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full')
        "
      >
        <div class="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">
              O
            </div>
            <div>
              <p class="text-sm font-semibold tracking-tight text-white">OmniStore</p>
              <p class="text-[11px] uppercase tracking-wider text-indigo-300">Super Admin</p>
            </div>
          </div>
          <button
            type="button"
            class="lg:hidden text-slate-400 hover:text-white text-xs"
            (click)="mobileMenuOpen.set(false)"
          >
            Close
          </button>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-indigo-600 text-white shadow-sm"
              (click)="mobileMenuOpen.set(false)"
              class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="p-3 border-t border-slate-800 space-y-2">
          <a
            routerLink="/profile"
            routerLinkActive="bg-slate-800 text-white"
            (click)="mobileMenuOpen.set(false)"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            @if (user()?.avatarUrl) {
              <img
                [src]="user()?.avatarUrl"
                alt="Avatar"
                class="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            } @else {
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
                {{ initials() }}
              </div>
            }
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white truncate">{{ user()?.name }}</p>
              <p class="text-[11px] text-slate-400 truncate">{{ user()?.email }}</p>
            </div>
          </a>

          <button
            type="button"
            (click)="logout()"
            class="w-full px-3 py-2 text-left text-xs font-medium text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 rounded-lg transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Workspace -->
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="mobileMenuOpen.set(true)"
              class="lg:hidden px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Menu
            </button>
            <h1 class="text-base font-semibold text-slate-800">{{ pageTitle() }}</h1>
          </div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
            SUPER ADMIN
          </span>
        </header>

        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class PortalShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly mobileMenuOpen = signal(false);
  readonly user = this.authService.currentUser;

  readonly navItems: NavItem[] = [
    { label: 'Statistics & Overview', route: '/admin/overview' },
    { label: 'Users Directory', route: '/admin/users' },
    { label: 'Storefronts & Approvals', route: '/admin/stores' },
    { label: 'FAQs Management', route: '/admin/faqs' },
    { label: 'CMS (Terms & Policies)', route: '/admin/cms' },
    { label: 'Billing & Payouts', route: '/admin/billing' },
    { label: 'Website & DB Settings', route: '/admin/settings' },
  ];

  readonly initials = computed(() => {
    const name = this.user()?.name || 'A';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  readonly pageTitle = computed(() => {
    const url = this.router.url;
    const match = this.navItems.find((i) => url.startsWith(i.route));
    if (match) return match.label;
    if (url.startsWith('/profile')) return 'Administrator Profile';
    return 'Super Admin Console';
  });

  logout(): void {
    this.authService.logout();
  }
}
