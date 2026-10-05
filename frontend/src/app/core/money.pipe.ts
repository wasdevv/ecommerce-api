import { Pipe, PipeTransform } from '@angular/core';

/** Integer cents in, formatted currency out. The only place money becomes a decimal. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  }
}
