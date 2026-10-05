import { Component, computed, input } from '@angular/core';
import { OrderStatus } from '../core/models';

const TONES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  cancelled: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize" [class]="tone()">{{ status() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly tone = computed(() => TONES[this.status()]);
}
