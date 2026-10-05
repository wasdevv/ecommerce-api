import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorMagnifyingGlass } from '@ng-icons/phosphor-icons/regular';
import { valueOf } from '../core/resource';
import { toApiError } from '../core/api-error';
import { Category, Page, Product } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { ErrorNote } from '../shared/error-note';

@Component({
  imports: [RouterLink, NgIcon, MoneyPipe, ErrorNote],
  providers: [provideIcons({ phosphorMagnifyingGlass })],
  templateUrl: './catalog.html',
})
export class CatalogPage {
  private router = inject(Router);
  private query = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  // The URL is the state: filters survive refresh and can be shared.
  protected readonly q = computed(() => this.query().get('q') ?? '');
  protected readonly category = computed(() => this.query().get('category') ?? '');
  protected readonly sort = computed(() => this.query().get('sort') ?? 'newest');
  protected readonly page = computed(() => Number(this.query().get('page') ?? 1));
  protected readonly term = signal(this.q());

  protected readonly categories = httpResource<{ data: Category[] }>(() => '/api/v1/categories');
  protected readonly products = httpResource<Page<Product>>(() => ({
    url: '/api/v1/products',
    params: {
      per_page: 12,
      page: this.page(),
      sort: this.sort(),
      ...(this.q() && { q: this.q() }),
      ...(this.category() && { category: this.category() }),
    },
  }));
  protected readonly categoryChips = computed(() => [{ slug: '', name: 'All' }, ...(valueOf(this.categories)?.data ?? [])]);
  protected readonly error = computed(() => (this.products.error() ? toApiError(this.products.error()) : null));

  constructor() {
    // Debounced search: typing updates the URL 300ms after the last keystroke.
    effect((onCleanup) => {
      const term = this.term();
      if (term === this.q()) return;
      const t = setTimeout(() => this.set({ q: term }), 300);
      onCleanup(() => clearTimeout(t));
    });
  }

  /** Any filter change goes back to page 1 unless the page itself is what changed. */
  protected set(patch: Record<string, string | number | null>): void {
    const params = { page: null, ...patch };
    const cleaned = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === '' || v === 'newest' || v === 1 ? null : v]));
    this.router.navigate([], { queryParams: cleaned, queryParamsHandling: 'merge' });
  }

  protected clear(): void {
    this.term.set('');
    this.router.navigate([], { queryParams: {} });
  }
}
