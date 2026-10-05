import { HttpTestingController } from '@angular/common/http/testing';
import { Cart, Product } from '../core/models';
import { byText, settle, setup, signIn, text, visit } from '../../testing/setup';

const lamp: Product = { id: 4, name: 'Desk Lamp', slug: 'desk-lamp', description: '', price_cents: 2500, stock: 5, image_url: null, is_active: true };
const cart = (quantity: number): { data: Cart } => ({
  data: {
    items: quantity ? [{ product: lamp, quantity, line_total_cents: 2500 * quantity }] : [],
    subtotal_cents: 2500 * quantity, shipping_cents: quantity ? 990 : 0, total_cents: 2500 * quantity + (quantity ? 990 : 0), currency: 'usd',
  },
});

describe('CartPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    ({ http } = setup());
    signIn();
  });
  afterEach(() => http.verify());

  async function open(initial = cart(2)) {
    const view = await visit('/cart');
    http.expectOne('/api/v1/cart').flush(initial);
    await settle(view.harness);
    return view;
  }

  it('shows the totals the server computed', async () => {
    const { el } = await open();
    expect(text(el.querySelector('[data-testid="total"]'))).toBe('$59.90');
    expect(text(el)).toContain('$9.90');
  });

  it('changing the quantity PUTs it and renders the cart the server returns', async () => {
    const { harness, el } = await open();
    const select = el.querySelector<HTMLSelectElement>('#qty-4')!;
    select.value = '3';
    select.dispatchEvent(new Event('change'));

    const req = http.expectOne('/api/v1/cart/items/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 3 });
    req.flush(cart(3));
    await settle(harness);

    expect(text(el.querySelector('[data-testid="total"]'))).toBe('$84.90');
  });

  it('keeps the cart and shows the reason when the server refuses a quantity', async () => {
    const { harness, el } = await open();
    const select = el.querySelector<HTMLSelectElement>('#qty-4')!;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    http.expectOne('/api/v1/cart/items/4').flush({ message: 'Only 4 left in stock.', code: 'insufficient_stock' }, { status: 422, statusText: 'Unprocessable' });
    await settle(harness);

    expect(text(el.querySelector('[role="alert"]'))).toContain('Only 4 left in stock.');
    expect(text(el.querySelector('[data-testid="total"]'))).toBe('$59.90');
  });

  it('removing the last item shows the empty state', async () => {
    const { harness, el } = await open();
    el.querySelector<HTMLButtonElement>('[aria-label="Remove Desk Lamp"]')!.click();
    const req = http.expectOne('/api/v1/cart/items/4');
    expect(req.request.method).toBe('DELETE');
    req.flush(cart(0));
    await settle(harness);

    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
    expect(byText(el, 'a', 'Browse the catalog')).not.toBeNull();
  });
});
