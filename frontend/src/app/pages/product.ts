import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorArrowLeft } from '@ng-icons/phosphor-icons/regular';
import { firstValueFrom } from 'rxjs';
import { valueOf } from '../core/resource';
import { ApiError, toApiError } from '../core/api-error';
import { AuthService } from '../core/auth.service';
import { Product } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { ErrorNote } from '../shared/error-note';

@Component({
  imports: [RouterLink, NgIcon, MoneyPipe, ErrorNote],
  providers: [provideIcons({ phosphorArrowLeft })],
  template: `
    <div class="grid gap-6">
      <a routerLink="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"><ng-icon name="phosphorArrowLeft" size="16" /> Catalog</a>
      @if (product.isLoading()) {
        <div class="grid gap-8 md:grid-cols-2"><div class="skeleton aspect-[4/3]"></div><div class="grid content-start gap-4"><div class="skeleton h-8 w-2/3"></div><div class="skeleton h-24"></div></div></div>
      } @else if (loadError()?.status === 404) {
        <p class="py-24 text-center text-zinc-500">This product is no longer available. <a routerLink="/" class="text-accent underline">Back to the catalog</a></p>
      } @else if (loadError()) {
        <app-error-note [error]="loadError()" [retryable]="true" (retry)="product.reload()" />
      } @else if (product.hasValue()) {
        @let p = product.value().data;
        <div class="grid gap-8 md:grid-cols-[3fr_2fr] md:gap-12">
          <img [src]="p.image_url" [alt]="p.name" width="600" height="450" class="aspect-[4/3] w-full rounded-xl bg-zinc-200 object-cover dark:bg-zinc-800" />
          <div class="grid content-start gap-5">
            <div>
              <p class="text-sm text-zinc-500">{{ p.category?.name }}</p>
              <h1 class="mt-1 text-3xl font-semibold tracking-tight">{{ p.name }}</h1>
              <p class="mt-3 text-2xl">{{ p.price_cents | money }}</p>
            </div>
            <p class="max-w-[65ch] leading-relaxed text-zinc-600 dark:text-zinc-400">{{ p.description }}</p>
            @if (p.stock > 0) {
              <div class="grid gap-3">
                <div class="flex items-end gap-3">
                  <div class="grid gap-2">
                    <label for="qty" class="text-sm font-medium">Quantity</label>
                    <select id="qty" [value]="quantity()" (change)="quantity.set(+$any($event.target).value)" class="field w-24">
                      @for (n of options(); track n) { <option [value]="n">{{ n }}</option> }
                    </select>
                  </div>
                  <button type="button" (click)="add(p)" [disabled]="saving()" class="btn-primary">{{ saving() ? 'Adding' : 'Add to cart' }}</button>
                </div>
                <p class="text-sm text-zinc-500">{{ p.stock }} in stock</p>
                <app-error-note [error]="saveError()" />
              </div>
            } @else {
              <p class="font-medium text-red-700 dark:text-red-400">Sold out</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ProductPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly slug = input.required<string>();
  protected readonly product = httpResource<{ data: Product }>(() => `/api/v1/products/${this.slug()}`);
  protected readonly loadError = computed(() => (this.product.error() ? toApiError(this.product.error()) : null));
  protected readonly options = computed(() => Array.from({ length: Math.min(valueOf(this.product)?.data.stock ?? 0, 10) }, (_, i) => i + 1));
  protected readonly quantity = signal(1);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<ApiError | null>(null);

  protected async add(p: Product): Promise<void> {
    if (!this.auth.user()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${p.slug}` } });
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(this.http.put(`/api/v1/cart/items/${p.id}`, { quantity: this.quantity() }));
      this.router.navigateByUrl('/cart');
    } catch (e) {
      this.saveError.set(toApiError(e));
    } finally {
      this.saving.set(false);
    }
  }
}
