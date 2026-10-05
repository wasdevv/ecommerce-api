import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { customer, settle, setup, text, visit } from '../../testing/setup';
import { AuthService } from '../core/auth.service';
import { TestBed } from '@angular/core/testing';

describe('AuthPage', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    ({ http, router } = setup());
    TestBed.inject(AuthService).ready.set(true);
  });
  afterEach(() => http.verify());

  function submit(el: HTMLElement, values: Record<string, string>) {
    for (const [id, value] of Object.entries(values)) el.querySelector<HTMLInputElement>(`#${id}`)!.value = value;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  it('signs in and returns to the page that required it', async () => {
    const { harness, el } = await visit('/login?returnUrl=%2Fcheckout');
    submit(el, { email: 'rafa@example.com', password: 'secret-123' });
    http.expectOne('/api/v1/auth/login').flush({ data: { token: 't', user: customer } });
    await settle(harness);
    await settle(harness);

    expect(router.url).toBe('/checkout');
    http.expectNone('/api/v1/auth/me');
    const lamp = { id: 4, name: 'Lamp', slug: 'lamp', description: '', price_cents: 2500, stock: 5, image_url: null, is_active: true };
    http.expectOne('/api/v1/cart').flush({ data: { items: [{ product: lamp, quantity: 1, line_total_cents: 2500 }], subtotal_cents: 2500, shipping_cents: 990, total_cents: 3490, currency: 'usd' } });
    await settle(harness);
  });

  it('never follows a returnUrl to another site', async () => {
    const { harness, el } = await visit('/login?returnUrl=%2F%2Fevil.example');
    submit(el, { email: 'rafa@example.com', password: 'secret-123' });
    http.expectOne('/api/v1/auth/login').flush({ data: { token: 't', user: customer } });
    await settle(harness);
    await settle(harness);

    expect(router.url).toBe('/');
    http.match(() => true).forEach((r) => r.flush({ data: [], meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 } }));
  });

  it('shows the server message on wrong credentials', async () => {
    const { harness, el } = await visit('/login');
    submit(el, { email: 'rafa@example.com', password: 'nope' });
    http.expectOne('/api/v1/auth/login').flush({ message: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });
    await settle(harness);

    expect(text(el.querySelector('[role="alert"]'))).toBe('Invalid credentials.');
  });

  it('register shows each validation error under its field', async () => {
    const { harness, el } = await visit('/register');
    submit(el, { name: 'Rafa', email: 'taken@example.com', password: 'short', password_confirmation: 'short' });
    const req = http.expectOne('/api/v1/auth/register');
    expect(req.request.body).toEqual({ name: 'Rafa', email: 'taken@example.com', password: 'short', password_confirmation: 'short' });
    req.flush({ message: 'Invalid', errors: { email: ['The email has already been taken.'], password: ['The password field must be at least 8 characters.'] } }, { status: 422, statusText: 'Unprocessable' });
    await settle(harness);

    expect(text(el.querySelector('#email-error'))).toBe('The email has already been taken.');
    expect(text(el.querySelector('#password-error'))).toContain('at least 8');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
