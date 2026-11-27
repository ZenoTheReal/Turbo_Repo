import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/guards/auth.guard';
import { PortalShellComponent } from './shared/layout/portal-shell.component';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    component: PortalShellComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'admin',
        children: [
          {
            path: 'overview',
            loadComponent: () =>
              import('./features/admin/admin-overview.component').then(
                (m) => m.AdminOverviewComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
          },
          {
            path: 'stores',
            loadComponent: () =>
              import('./features/admin/admin-stores.component').then((m) => m.AdminStoresComponent),
          },
          {
            path: 'faqs',
            loadComponent: () =>
              import('./features/admin/admin-faqs.component').then((m) => m.AdminFaqsComponent),
          },
          {
            path: 'cms',
            loadComponent: () =>
              import('./features/admin/admin-cms.component').then((m) => m.AdminCmsComponent),
          },
          {
            path: 'billing',
            loadComponent: () =>
              import('./features/admin/admin-billing.component').then(
                (m) => m.AdminBillingComponent,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/admin/admin-settings.component').then(
                (m) => m.AdminSettingsComponent,
              ),
          },
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      { path: '', redirectTo: 'admin/overview', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'admin/overview' },
];
