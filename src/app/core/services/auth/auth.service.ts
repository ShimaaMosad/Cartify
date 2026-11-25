import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  SignupRequest,
  SigninRequest,
  AuthResponse,
  AuthUser,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyTokenResponse,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  UpdateUserDataRequest,
  UpdateUserDataResponse,
  GetAllUsersResponse,
} from '../../models/auth.interface';

const TOKEN_KEY = 'cartify_token';
const USER_KEY = 'cartify_user';

type UserWithOptionalIds = AuthUser & {
  _id?: string;
  id?: string;
  userId?: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly authUrl = `${environment.apiUrl}/api/v1/auth`;
  private readonly userUrl = `${environment.apiUrl}/api/v1/users`;

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());
  readonly token = signal<string | null>(this.readStoredToken());

  readonly currentUserId = computed<string | null>(() => {
    const user = this.currentUser() as UserWithOptionalIds | null;
    if (user?._id) return String(user._id).trim();
    if (user?.id) return String(user.id).trim();
    if (user?.userId) return String(user.userId).trim();

    const activeToken = this.token();
    if (!activeToken || activeToken.split('.').length !== 3 || !this.isBrowser) {
      return null;
    }

    try {
      const base64 = activeToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      const decodedId = payload?.id || payload?._id || payload?.userId || payload?.sub;
      return decodedId ? String(decodedId).trim() : null;
    } catch {
      return null;
    }
  });

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  private readStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return (parsed.user && typeof parsed.user === 'object' ? parsed.user : parsed) as AuthUser;
      }
      return null;
    } catch {
      return null;
    }
  }

  setSession(auth: AuthResponse): void {
    this.token.set(auth.token);
    this.currentUser.set(auth.user);

    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, auth.token);
      localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    }
  }

  updateStoredUser(user: AuthUser): void {
    this.currentUser.set(user);
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  // ==============================
  // Authentication
  // ==============================

  signIn(signInData: SigninRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/signin`, signInData).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res);
        }
      }),
    );
  }

  signUp(signUpData: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/signup`, signUpData).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res);
        }
      }),
    );
  }

  // ==============================
  // Forgot Password
  // ==============================

  forgetPassword(forgetPasswordData: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(
      `${this.authUrl}/forgotPasswords`,
      forgetPasswordData,
    );
  }

  // ==============================
  // Verify Reset Code
  // ==============================

  verifyCode(code: VerifyResetCodeRequest): Observable<VerifyResetCodeResponse> {
    return this.http.post<VerifyResetCodeResponse>(`${this.authUrl}/verifyResetCode`, code);
  }

  // ==============================
  // Reset Password
  // ==============================

  resetPassword(resetPasswordData: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.http.put<ResetPasswordResponse>(`${this.authUrl}/resetPassword`, resetPasswordData);
  }

  // ==============================
  // Verify Token
  // ==============================

  verifyToken(): Observable<VerifyTokenResponse> {
    return this.http.get<VerifyTokenResponse>(`${this.authUrl}/verifyToken`);
  }

  // ==============================
  // User Management
  // ==============================

  updatePassword(passwordData: UpdatePasswordRequest): Observable<UpdatePasswordResponse> {
    return this.http
      .put<UpdatePasswordResponse>(`${this.userUrl}/changeMyPassword`, passwordData)
      .pipe(
        tap((res) => {
          if (res.token) {
            this.token.set(res.token);
            if (this.isBrowser) {
              localStorage.setItem(TOKEN_KEY, res.token);
            }
          }
          if (res.user) {
            this.updateStoredUser(res.user);
          }
        }),
      );
  }

  updateUserData(userData: UpdateUserDataRequest): Observable<UpdateUserDataResponse> {
    return this.http.put<UpdateUserDataResponse>(`${this.userUrl}/updateMe/`, userData).pipe(
      tap((res) => {
        if (res.message === 'success' && res.user) {
          this.updateStoredUser(res.user);
        }
      }),
    );
  }

  getAllUsers(): Observable<GetAllUsersResponse> {
    return this.http.get<GetAllUsersResponse>(this.userUrl);
  }
}
