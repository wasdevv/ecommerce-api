import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Cart } from '../core/models';
import { settle, setup, signIn, text, visit } from '../../testing/setup';

const filled: { data: Cart } = {
  data: {
    items: [{ product: { id: 4, name: 'Lamp', slug: 'lamp', description: '', price_cents: 2500, stock: 5, image_url: null, is_active: true }, quantity: 1, line_total_cents: 2500 }],
    subtotal_cents: 2500, shipping_cents: 990, total_cents: 3490, currency: 'usd',
  },
};

describe('CheckoutPage', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    ({ http, router } = setup());
    signIn();
  });
  afterEach(() => http.verify());

  async function open() {
    const view = await visit('/checkout');
    http.expectOne('/api/v1/cart').flush(filled);
    await settle(view.harness);
    return view;
  }

  function fill(el: HTMLElement, values: Record<string, string>) {
    for (const [id, value] of Object.entries(values)) el.querySelector<HTMLInputElement>(`#${id}`)!.value = value;
  }

  it('prefills the name, posts only the address, and opens the new order', async () => {
    const { harness, el } = await open();
    expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('Rafaela Moura');
    fill(el, { street: 'Rua Augusta 1200', city: 'Sao Paulo', zip: '01304-001', country: 'br' });

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/v1/orders');
    expect(req.request.body).toEqual({
      shipping_address: { name: 'Rafaela Moura', street: 'Rua Augusta 1200', city: 'Sao Paulo', zip: '01304-001', country: 'BR' },
    });
    expect(Object.keys(req.request.body)).toEqual(['shipping_address']); // no client-side totals or prices
    req.flush({ data: { id: 31 } }, { status: 201, statusText: 'Created' });
    await settle(harness);

    expect(router.url).toBe('/orders/31');
    http.expectOne('/api/v1/orders/31').flush({}, { status: 404, statusText: 'Not Found' });
  });

  it('shows validation errors next to the field', async () => {
    const { harness, el } = await open();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/v1/orders').flush(
      { message: 'Invalid', errors: { 'shipping_address.city': ['The city field is required.'] } },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle(harness);

    expect(el.querySelector('#city')!.getAttribute('aria-invalid')).toBe('true');
    expect(text(el)).toContain('The city field is required.');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('on insufficient stock, explains and reloads the cart to show what is left', async () => {
    const { harness, el } = await open();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/v1/orders').flush(
      { message: 'Some items are no longer available in the requested quantity.', code: 'insufficient_stock', details: {} },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle(harness);

    expect(text(el.querySelector('[role="alert"]'))).toContain('no longer available');
    http.expectOne('/api/v1/cart').flush(filled);
    await settle(harness);
    expect(router.url).toBe('/checkout');
  });

  it('an empty cart has nothing to check out', async () => {
    const { harness } = await visit('/checkout');
    http.expectOne('/api/v1/cart').flush({ data: { ...filled.data, items: [] } });
    await settle(harness);

    expect(router.url).toBe('/cart');
    http.expectOne('/api/v1/cart').flush({ data: { ...filled.data, items: [] } }); // the cart page's own load
  });
});
