import { Injectable, signal } from '@angular/core';

const KEY = 'token';

/** The JWT, persisted. Kept apart from AuthService so the interceptor can read it without a DI cycle. */
@Injectable({ providedIn: 'root' })
export class Session {
  readonly token = signal<string | null>(read());
  /** Bumped when the API rejects the token, so AuthService can drop the user. */
  readonly expired = signal(0);

  set(token: string | null): void {
    try {
      token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY);
    } catch { /* storage blocked: keep the token in memory for this tab */ }
    this.token.set(token);
  }
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
