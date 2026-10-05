import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toApiError } from '../core/api-error';
import { Order, Page } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { ErrorNote } from '../shared/error-note';
import { StatusBadge } from '../shared/status-badge';

@Component({
  imports: [RouterLink, DatePipe, MoneyPipe, ErrorNote, StatusBadge],
  template: `
    @if (orders.isLoading() && !orders.hasValue()) {
      <div class="grid gap-3" aria-busy="true"><div class="skeleton h-8 w-40"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div></div>
    } @else if (loadError()) {
      <app-error-note [error]="loadError()" [retryable]="true" (retry)="orders.reload()" />
    } @else if (orders.hasValue()) {
      @let result = orders.value();
      @if (result.data.length === 0) {
        <div class="py-20 text-center"><h1 class="text-2xl font-semibold">No orders yet</h1><a routerLink="/" class="btn-primary mt-6">Start shopping</a></div>
      } @else {
        <div class="grid gap-6">
          <h1 class="text-2xl font-semibold tracking-tight">Orders</h1>
          <ul class="divide-y divide-zinc-200 dark:divide-zinc-800">
            @for (o of result.data; track o.id) {
              <li>
                <a [routerLink]="['/orders', o.id]" class="grid grid-cols-[1fr_auto] items-center gap-2 py-4 hover:bg-zinc-100 sm:grid-cols-[1fr_auto_auto] sm:gap-6 dark:hover:bg-zinc-900">
                  <div><p class="font-medium">{{ o.number }}</p><p class="text-sm text-zinc-500">{{ o.created_at | date: 'mediumDate' }}</p></div>
                  <app-status-badge [status]="o.status" />
                  <span class="col-span-2 text-sm font-medium sm:col-span-1">{{ o.total_cents | money: o.currency }}</span>
                </a>
              </li>
            }
          </ul>
          @if (result.meta.last_page > 1) {
            <nav class="flex justify-center gap-3" aria-label="Pagination">
              <button type="button" class="btn-ghost" [disabled]="result.meta.current_page === 1" (click)="go(result.meta.current_page - 1)">Previous</button>
              <button type="button" class="btn-ghost" [disabled]="result.meta.current_page === result.meta.last_page" (click)="go(result.meta.current_page + 1)">Next</button>
            </nav>
          }
        </div>
      }
    }
  `,
})
export class OrdersPage {
  private router = inject(Router);
  readonly page = input<string | undefined>();
  protected readonly orders = httpResource<Page<Order>>(() => ({ url: '/api/v1/orders', params: { page: this.page() ?? 1 } }));
  protected readonly loadError = computed(() => (this.orders.error() ? toApiError(this.orders.error()) : null));

  protected go(page: number): void {
    this.router.navigate([], { queryParams: { page } });
  }
}
