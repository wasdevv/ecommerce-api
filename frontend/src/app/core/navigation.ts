import { InjectionToken } from '@angular/core';

/** Full-page navigation to another origin (Stripe Checkout). A token so tests can observe it instead of leaving the page. */
export const EXTERNAL_REDIRECT = new InjectionToken<(url: string) => void>('EXTERNAL_REDIRECT', {
  providedIn: 'root',
  factory: () => (url: string) => window.location.assign(url),
});
