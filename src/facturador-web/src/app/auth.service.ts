import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfigService } from './api-config.service';

export interface JwtLoginResponse {
  status: string;
  tokens?: { success: boolean; message: string; accessToken?: string; refreshToken?: string; expiresIn?: number };
  setup?: { setupToken: string; expiresInSeconds: number };
  challenge?: { challengeToken: string; expiresInSeconds: number };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly accessToken = signal<string | null>(null);
  readonly userEmail = signal('');
  readonly isAuthenticated = computed(() => !!this.accessToken());
  token() { return this.accessToken(); }
  login(email: string, password: string) {
    this.userEmail.set(email);
    return this.http.post<JwtLoginResponse>(this.apiConfig.url('auth/login'), { email, password });
  }
  acceptLogin(result: JwtLoginResponse): boolean {
    if (!result.tokens?.success || !result.tokens.accessToken || result.setup || result.challenge) return false;
    this.accessToken.set(result.tokens.accessToken);
    return true;
  }
  logout() { this.accessToken.set(null); this.userEmail.set(''); }
}
