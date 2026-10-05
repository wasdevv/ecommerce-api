import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorTrash } from '@ng-icons/phosphor-icons/regular';
import { firstValueFrom } from 'rxjs';
import { ApiError, toApiError } from '../core/api-error';
import { Cart } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { ErrorNote } from '../shared/error-note';
import { Totals } from '../shared/totals';

@Component({
  imports: [RouterLink, NgIcon, MoneyPipe, ErrorNote, Totals],
  providers: [provideIcons({ phosphorTrash })],
  template: `
    @if (cart.isLoading() && !cart.hasValue()) {
      <div class="grid gap-4" aria-busy="true"><div class="skeleton h-8 w-40"></div><div class="skeleton h-24"></div><div class="skeleton h-24"></div></div>
    } @else if (loadError()) {
      <app-error-note [error]="loadError()" [retryable]="true" (retry)="cart.reload()" />
    } @else if (cart.hasValue()) {
      @let c = cart.value().data;
      @if (c.items.length === 0) {
        <div class="py-20 text-center" data-testid="empty">
          <h1 class="text-2xl font-semibold">Your cart is empty</h1>
          <a routerLink="/" class="btn-primary mt-6">Browse the catalog</a>
        </div>
      } @else {
        <div class="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <section>
            <h1 class="mb-6 text-2xl font-semibold tracking-tight">Cart</h1>
            <app-error-note [error]="actionError()" />
            <ul class="divide-y divide-zinc-200 dark:divide-zinc-800">
              @for (item of c.items; track item.product.id) {
                <li class="grid grid-cols-[80px_1fr_auto] items-center gap-4 py-4">
                  <img [src]="item.product.image_url" alt="" width="80" height="60" class="aspect-[4/3] rounded-lg object-cover" />
                  <div class="min-w-0">
                    <a [routerLink]="['/products', item.product.slug]" class="font-medium hover:underline">{{ item.product.name }}</a>
                    <div class="mt-2 flex items-center gap-2">
                      <label class="sr-only" [for]="'qty-' + item.product.id">Quantity for {{ item.product.name }}</label>
                      <select [id]="'qty-' + item.product.id" [value]="item.quantity" (change)="setQuantity(item.product.id, +$any($event.target).value)" class="field w-20 py-1.5">
                        @for (n of quantities(item.quantity, item.product.stock); track n) { <option [value]="n">{{ n }}</option> }
                      </select>
                      <button type="button" (click)="remove(item.product.id)" class="btn-ghost px-2.5 py-1.5" [attr.aria-label]="'Remove ' + item.product.name">
                        <ng-icon name="phosphorTrash" size="16" />
                      </button>
                    </div>
                  </div>
                  <span class="text-sm font-medium">{{ item.line_total_cents | money: c.currency }}</span>
                </li>
              }
            </ul>
          </section>
          <aside class="grid h-fit gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <app-totals [subtotal]="c.subtotal_cents" [shipping]="c.shipping_cents" [total]="c.total_cents" [currency]="c.currency" />
            <a routerLink="/checkout" class="btn-primary">Checkout</a>
          </aside>
        </div>
      }
    }
  `,
})
export class CartPage {
  private http = inject(HttpClient);
  protected readonly cart = httpResource<{ data: Cart }>(() => '/api/v1/cart');
  protected readonly loadError = computed(() => (this.cart.error() ? toApiError(this.cart.error()) : null));
  protected readonly actionError = signal<ApiError | null>(null);

  protected quantities(current: number, stock: number): number[] {
    return Array.from({ length: Math.max(current, Math.min(stock, 10)) }, (_, i) => i + 1);
  }

  protected setQuantity(productId: number, quantity: number): Promise<void> {
    return this.apply(this.http.put<{ data: Cart }>(`/api/v1/cart/items/${productId}`, { quantity }));
  }

  protected remove(productId: number): Promise<void> {
    return this.apply(this.http.delete<{ data: Cart }>(`/api/v1/cart/items/${productId}`));
  }

  /** Every cart mutation answers with the whole cart: show exactly what the server holds. */
  private async apply(request: ReturnType<HttpClient['get']>): Promise<void> {
    try {
      this.cart.set((await firstValueFrom(request)) as { data: Cart });
      this.actionError.set(null);
    } catch (e) {
      this.actionError.set(toApiError(e));
    }
  }
}
