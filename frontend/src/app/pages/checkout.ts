import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { valueOf } from '../core/resource';
import { ApiError, fieldError, generalError, toApiError } from '../core/api-error';
import { AuthService } from '../core/auth.service';
import { Address, Cart, Order } from '../core/models';
import { ErrorNote } from '../shared/error-note';
import { Totals } from '../shared/totals';

const FIELDS: { name: keyof Address; label: string; autocomplete: string; wide?: boolean }[] = [
  { name: 'name', label: 'Full name', autocomplete: 'name', wide: true },
  { name: 'street', label: 'Street address', autocomplete: 'street-address', wide: true },
  { name: 'city', label: 'City', autocomplete: 'address-level2' },
  { name: 'zip', label: 'Postal code', autocomplete: 'postal-code' },
  { name: 'country', label: 'Country code', autocomplete: 'country' },
];

@Component({
  imports: [ErrorNote, Totals],
  template: `
    @if (cart.isLoading() && !cart.hasValue()) {
      <div class="skeleton h-64" aria-busy="true"></div>
    } @else if (loadError()) {
      <app-error-note [error]="loadError()" [retryable]="true" (retry)="cart.reload()" />
    } @else if (cart.hasValue()) {
      @let c = cart.value().data;
      <form (submit)="submit($event)" class="grid gap-8 lg:grid-cols-[2fr_1fr]" novalidate>
        <section class="grid content-start gap-5">
          <h1 class="text-2xl font-semibold tracking-tight">Shipping</h1>
          <app-error-note [error]="general()" />
          <div class="grid gap-4 sm:grid-cols-2">
            @for (f of fields; track f.name) {
              <div class="grid gap-2" [class.sm:col-span-2]="f.wide">
                <label [for]="f.name" class="text-sm font-medium">{{ f.label }}</label>
                <input [id]="f.name" [name]="f.name" [attr.autocomplete]="f.autocomplete" required class="field"
                  [value]="f.name === 'name' ? (auth.user()?.name ?? '') : ''" [attr.maxlength]="f.name === 'country' ? 2 : null"
                  [attr.placeholder]="f.name === 'country' ? 'BR' : null"
                  [attr.aria-invalid]="!!fieldError(error(), 'shipping_address.' + f.name)" />
                @if (fieldError(error(), 'shipping_address.' + f.name); as msg) {
                  <p class="text-sm text-red-700 dark:text-red-400">{{ msg }}</p>
                }
              </div>
            }
          </div>
        </section>
        <aside class="grid h-fit gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 class="font-semibold">{{ c.items.length }} item(s)</h2>
          <app-totals [subtotal]="c.subtotal_cents" [shipping]="c.shipping_cents" [total]="c.total_cents" [currency]="c.currency" />
          <button class="btn-primary" [disabled]="busy()">{{ busy() ? 'Placing order' : 'Place order' }}</button>
          <p class="text-xs text-zinc-500">Stock is reserved when the order is placed. You pay on the next step.</p>
        </aside>
      </form>
    }
  `,
})
export class CheckoutPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  protected auth = inject(AuthService);

  protected readonly fields = FIELDS;
  protected readonly fieldError = fieldError;
  protected readonly cart = httpResource<{ data: Cart }>(() => '/api/v1/cart');
  protected readonly loadError = computed(() => (this.cart.error() ? toApiError(this.cart.error()) : null));
  protected readonly error = signal<ApiError | null>(null);
  protected readonly general = computed(() => generalError(this.error()));
  protected readonly busy = signal(false);

  constructor() {
    // Nothing to check out: back to the (empty) cart.
    effect(() => {
      if (valueOf(this.cart)?.data.items.length === 0) this.router.navigateByUrl('/cart', { replaceUrl: true });
    });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const address = Object.fromEntries(new FormData(event.target as HTMLFormElement)) as unknown as Address;
    address.country = (address.country ?? '').toUpperCase();
    this.busy.set(true);
    this.error.set(null);
    try {
      const { data } = await firstValueFrom(this.http.post<{ data: Order }>('/api/v1/orders', { shipping_address: address }));
      this.router.navigate(['/orders', data.id], { replaceUrl: true });
    } catch (e) {
      const err = toApiError(e);
      this.error.set(err);
      if (err.code === 'insufficient_stock') this.cart.reload(); // show what is actually left
    } finally {
      this.busy.set(false);
    }
  }
}
