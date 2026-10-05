import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { phosphorArrowLeft } from '@ng-icons/phosphor-icons/regular';
import { firstValueFrom } from 'rxjs';
import { valueOf } from '../core/resource';
import { ApiError, toApiError } from '../core/api-error';
import { Order, PaymentStart } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { EXTERNAL_REDIRECT } from '../core/navigation';
import { ErrorNote } from '../shared/error-note';
import { StatusBadge } from '../shared/status-badge';
import { Totals } from '../shared/totals';

export const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

@Component({
  imports: [RouterLink, NgIcon, MoneyPipe, ErrorNote, StatusBadge, Totals],
  providers: [provideIcons({ phosphorArrowLeft })],
  templateUrl: './order.html',
})
export class OrderPage {
  private http = inject(HttpClient);
  private redirect = inject(EXTERNAL_REDIRECT);

  readonly id = input.required<string>();
  /** `?checkout=success` when Stripe sends the buyer back. */
  readonly checkout = input<string | undefined>();

  protected readonly order = httpResource<{ data: Order }>(() => `/api/v1/orders/${this.id()}`);
  protected readonly loadError = computed(() => (this.order.error() ? toApiError(this.order.error()) : null));
  protected readonly status = computed(() => valueOf(this.order)?.data.status);
  protected readonly awaitingStripe = computed(() => this.checkout() === 'success' && this.status() === 'pending');
  protected readonly busy = signal<'pay' | 'simulate' | 'cancel' | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly localMode = signal(false);

  constructor() {
    // Stripe confirms through a webhook a few seconds after the redirect back: poll until it lands.
    // ponytail: polling every 3s for at most a minute; push (SSE/WebSocket) when status changes need to be instant
    effect((onCleanup) => {
      if (!this.awaitingStripe()) return;
      let polls = 0;
      const timer = setInterval(() => (++polls > MAX_POLLS ? clearInterval(timer) : this.order.reload()), POLL_INTERVAL_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected pay(): Promise<void> {
    return this.act('pay', async () => {
      const { data } = await firstValueFrom(this.http.post<{ data: PaymentStart }>(`/api/v1/orders/${this.id()}/payments`, null));
      if (data.checkout_url) this.redirect(data.checkout_url);
      else this.localMode.set(true);
    });
  }

  protected simulate(): Promise<void> {
    return this.act('simulate', async () => {
      this.order.set(await firstValueFrom(this.http.post<{ data: Order }>(`/api/v1/orders/${this.id()}/payments/simulate`, null)));
    });
  }

  protected cancel(): Promise<void> {
    return this.act('cancel', async () => {
      this.order.set(await firstValueFrom(this.http.post<{ data: Order }>(`/api/v1/orders/${this.id()}/cancel`, null)));
    });
  }

  private async act(name: 'pay' | 'simulate' | 'cancel', fn: () => Promise<void>): Promise<void> {
    this.busy.set(name);
    this.actionError.set(null);
    try {
      await fn();
    } catch (e) {
      this.actionError.set(toApiError(e));
    } finally {
      this.busy.set(null);
    }
  }
}
