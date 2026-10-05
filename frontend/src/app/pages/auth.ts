import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError, fieldError, generalError, toApiError } from '../core/api-error';
import { AuthService } from '../core/auth.service';
import { ErrorNote } from '../shared/error-note';

interface FieldDef { name: string; label: string; type: string; autocomplete: string }

const LOGIN: FieldDef[] = [
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' },
];
const REGISTER: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  { name: 'password_confirmation', label: 'Confirm password', type: 'password', autocomplete: 'new-password' },
];

/** Login and register: same form, different fields (route data `mode`). */
@Component({
  imports: [RouterLink, ErrorNote],
  template: `
    <form (submit)="submit($event)" class="mx-auto grid w-full max-w-sm gap-5" novalidate>
      <h1 class="text-2xl font-semibold tracking-tight">{{ title() }}</h1>
      <app-error-note [error]="general()" />
      @for (f of fields(); track f.name) {
        <div class="grid gap-2">
          <label [for]="f.name" class="text-sm font-medium">{{ f.label }}</label>
          <input [id]="f.name" [name]="f.name" [type]="f.type" [attr.autocomplete]="f.autocomplete" required class="field"
            [attr.aria-invalid]="!!fieldError(error(), f.name)" [attr.aria-describedby]="fieldError(error(), f.name) ? f.name + '-error' : null" />
          @if (fieldError(error(), f.name); as msg) {
            <p [id]="f.name + '-error'" class="text-sm text-red-700 dark:text-red-400">{{ msg }}</p>
          }
        </div>
      }
      <button class="btn-primary" [disabled]="busy()">{{ busy() ? 'Please wait' : title() }}</button>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        @if (mode() === 'login') {
          New here? <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl() }" class="text-accent underline">Create an account</a>
        } @else {
          Already have an account? <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }" class="text-accent underline">Sign in</a>
        }
      </p>
    </form>
  `,
})
export class AuthPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode = input<'login' | 'register'>('login');
  // Router input binding sets undefined when the query param is absent, so no default here.
  readonly returnUrl = input<string | undefined>();
  protected readonly title = computed(() => (this.mode() === 'login' ? 'Sign in' : 'Create account'));
  protected readonly fields = computed(() => (this.mode() === 'login' ? LOGIN : REGISTER));
  protected readonly error = signal<ApiError | null>(null);
  protected readonly general = computed(() => generalError(this.error()));
  protected readonly busy = signal(false);
  protected readonly fieldError = fieldError;

  constructor() {
    // Already signed in (or just signed in): go where the user was heading. Only same-site paths.
    effect(() => {
      if (this.auth.user()) this.router.navigateByUrl(this.safeReturnUrl());
    });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target as HTMLFormElement)) as Record<string, string>;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') await this.auth.login(data['email'], data['password']);
      else await this.auth.register(data as Parameters<AuthService['register']>[0]);
    } catch (e) {
      this.error.set(toApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private safeReturnUrl(): string {
    const url = this.returnUrl() ?? '/';
    return url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
