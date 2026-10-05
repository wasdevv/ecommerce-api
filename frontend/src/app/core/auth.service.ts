import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { User } from './models';
import { Session } from './session';

interface TokenResponse { data: { token: string; user: User } }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private session = inject(Session);

  readonly user = signal<User | null>(null);
  /** False until the stored token (if any) has been checked against the API. */
  readonly ready = signal(false);
  private restoring: Promise<void> | null = null;

  constructor() {
    effect(() => {
      if (this.session.expired()) this.user.set(null);
    });
  }

  /** Resolves once we know who the user is. The token is the only thing stored; the user always comes from the API. */
  restore(): Promise<void> {
    this.restoring ??= (async () => {
      if (this.session.token()) {
        try {
          this.user.set((await firstValueFrom(this.http.get<{ data: User }>('/api/v1/auth/me'))).data);
        } catch {
          this.session.set(null);
        }
      }
      this.ready.set(true);
    })();
    return this.restoring;
  }

  login(email: string, password: string): Promise<void> {
    return this.signIn('/api/v1/auth/login', { email, password });
  }

  register(payload: { name: string; email: string; password: string; password_confirmation: string }): Promise<void> {
    return this.signIn('/api/v1/auth/register', payload);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/v1/auth/logout', null));
    } catch { /* already invalid: logging out locally is all that's left */ }
    this.session.set(null);
    this.user.set(null);
  }

  private async signIn(url: string, body: object): Promise<void> {
    const { data } = await firstValueFrom(this.http.post<TokenResponse>(url, body));
    this.session.set(data.token);
    this.user.set(data.user);
    this.ready.set(true);
    this.restoring = Promise.resolve(); // we just learned who the user is: no /auth/me needed
  }
}
