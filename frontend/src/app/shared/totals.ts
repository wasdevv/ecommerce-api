import { Component, input } from '@angular/core';
import { MoneyPipe } from '../core/money.pipe';

/** Subtotal / shipping / total block shared by cart, checkout and order. Values are the server's, never recomputed here. */
@Component({
  selector: 'app-totals',
  imports: [MoneyPipe],
  template: `
    <dl class="grid gap-2 text-sm">
      <div class="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>Subtotal</dt><dd>{{ subtotal() | money: currency() }}</dd></div>
      <div class="flex justify-between text-zinc-600 dark:text-zinc-400"><dt>Shipping</dt><dd>{{ shipping() ? (shipping() | money: currency()) : 'Free' }}</dd></div>
      <div class="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold dark:border-zinc-800"><dt>Total</dt><dd data-testid="total">{{ total() | money: currency() }}</dd></div>
    </dl>
  `,
})
export class Totals {
  readonly subtotal = input.required<number>();
  readonly shipping = input.required<number>();
  readonly total = input.required<number>();
  readonly currency = input('usd');
}
