import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, shareReplay, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, UserRole } from '../models/api.models';

const TOKEN_STORAGE_KEY = 'omnistore_admin_access_token';
const USER_STORAGE_KEY = 'omnistore_admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<AuthUser | null>(null);
  private refreshInFlight$: Observable<{ accessToken: string }> | null = null;

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._accessToken() && this._currentUser()));
  readonly userRole = computed<UserRole | null>(() => {
    const user = this._currentUser();
    if (!user?.role) return null;
    return typeof user.role === 'string' ? user.role : user.role.name;
  });

  constructor() {
    this.restoreSession();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private restoreSession(): void {
    if (!this.isBrowser()) return;
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const rawUser = localStorage.getItem(USER_STORAGE_KEY);
      if (token && rawUser) {
        this._accessToken.set(token);
        this._currentUser.set(JSON.parse(rawUser) as AuthUser);
      }
    } catch {
      this.clearSession();
    }
  }

  private persistSession(accessToken: string, user?: AuthUser | null): void {
    this._accessToken.set(accessToken);
    if (user) {
      this._currentUser.set(user);
    }
    if (this.isBrowser()) {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    }
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    if (this.isBrowser()) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  getDefaultRoute(): string {
    return '/admin/overview';
  }

  login(email: string, password: string) {
    return this.http
      .post<{ message: string; user: AuthUser; accessToken: string }>(
        `${this.apiUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          this.persistSession(res.accessToken, res.user);
        }),
      );
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(payload: { email: string; otp: string; newPassword: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, payload);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  refreshToken(): Observable<{ accessToken: string }> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<{ accessToken: string }>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          this.persistSession(res.accessToken);
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  loadProfile() {
    return this.http.get<{ message: string; user: AuthUser }>(`${this.apiUrl}/users/profile-details`).pipe(
      tap((res) => {
        if (res.user) {
          this._currentUser.set(res.user);
          if (this.isBrowser()) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
          }
        }
      }),
    );
  }

  updateProfile(data: { name?: string; phoneNumber?: string; avatarKey?: string; avatarUrl?: string }) {
    return this.http
      .patch<{ message: string; user: AuthUser }>(`${this.apiUrl}/users/profile`, data)
      .pipe(
        tap((res) => {
          if (res.user) {
            const current = this._currentUser();
            const merged = { ...current, ...res.user } as AuthUser;
            this._currentUser.set(merged);
            if (this.isBrowser()) {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
            }
          }
        }),
      );
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
      });
  }
}
