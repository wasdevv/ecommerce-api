import { HttpTestingController } from '@angular/common/http/testing';
import { Order } from '../core/models';
import { EXTERNAL_REDIRECT } from '../core/navigation';
import { byText, settle, setup, signIn, text, visit } from '../../testing/setup';
import { POLL_INTERVAL_MS } from './order';

const order = (status: Order['status']): { data: Order } => ({
  data: {
    id: 31, number: 'ORD-20261005-000031', status, subtotal_cents: 2500, shipping_cents: 990, total_cents: 3490, currency: 'usd', created_at: '2026-10-05T18:00:00Z',
    shipping_address: { name: 'Rafaela Moura', street: 'Rua Augusta 1200', city: 'Sao Paulo', zip: '01304-001', country: 'BR' },
    items: [{ product_id: 4, product_name: 'Lamp', unit_price_cents: 2500, quantity: 1, line_total_cents: 2500 }],
  },
});

describe('OrderPage', () => {
  let http: HttpTestingController;
  let redirected: string[];

  beforeEach(() => {
    redirected = [];
    ({ http } = setup([{ provide: EXTERNAL_REDIRECT, useValue: (url: string) => redirected.push(url) }]));
    signIn();
  });
  afterEach(() => http.verify());

  async function open(url = '/orders/31', status: Order['status'] = 'pending') {
    const view = await visit(url);
    http.expectOne('/api/v1/orders/31').flush(order(status));
    await settle(view.harness);
    return view;
  }

  it('with Stripe configured, Pay now sends the buyer to the hosted checkout', async () => {
    const { el } = await open();
    byText(el, 'button', 'Pay now')!.click();
    http.expectOne('/api/v1/orders/31/payments').flush({ data: { provider: 'stripe', reference: 'cs_1', checkout_url: 'https://checkout.stripe.com/c/cs_1' } });
    await new Promise((r) => setTimeout(r));

    expect(redirected).toEqual(['https://checkout.stripe.com/c/cs_1']);
  });

  it('in local mode, offers the simulated payment and shows the order as paid', async () => {
    const { harness, el } = await open();
    byText(el, 'button', 'Pay now')!.click();
    http.expectOne('/api/v1/orders/31/payments').flush({ data: { provider: 'fake', reference: 'fake_1', checkout_url: null } });
    await settle(harness);

    expect(redirected).toEqual([]);
    byText(el, 'button', 'Simulate payment')!.click();
    http.expectOne('/api/v1/orders/31/payments/simulate').flush(order('paid'));
    await settle(harness);

    expect(text(el.querySelector('h1')!.parentElement)).toContain('paid');
    expect(byText(el, 'button', 'Cancel order')).toBeNull();
  });

  it('shows why a cancel was refused', async () => {
    const { harness, el } = await open();
    byText(el, 'button', 'Cancel order')!.click();
    http.expectOne('/api/v1/orders/31/cancel').flush(
      { message: 'A paid order cannot be cancelled.', code: 'order_not_cancellable' },
      { status: 422, statusText: 'Unprocessable' },
    );
    await settle(harness);

    expect(text(el.querySelector('[role="alert"]'))).toContain('cannot be cancelled');
  });

  it('back from Stripe, polls until the webhook marks the order paid, then stops', async () => {
    jasmine.clock().install();
    try {
      const { harness, el } = await open('/orders/31?checkout=success');
      expect(text(el)).toContain('Waiting for the payment confirmation');

      jasmine.clock().tick(POLL_INTERVAL_MS);
      await settle(harness);
      http.expectOne('/api/v1/orders/31').flush(order('pending'));
      await settle(harness);

      jasmine.clock().tick(POLL_INTERVAL_MS);
      await settle(harness);
      http.expectOne('/api/v1/orders/31').flush(order('paid'));
      await settle(harness);
      expect(text(el)).not.toContain('Waiting for the payment confirmation');

      jasmine.clock().tick(POLL_INTERVAL_MS * 3);
      await settle(harness);
      http.expectNone('/api/v1/orders/31');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it("someone else's order reads as not found", async () => {
    const { harness, el } = await visit('/orders/31');
    http.expectOne('/api/v1/orders/31').flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    await settle(harness);

    expect(text(el)).toContain('Order not found.');
  });
});
