import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Product } from '../core/models';
import { byText, settle, setup, text, visit } from '../../testing/setup';

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id, name: `Product ${id}`, slug: `product-${id}`, description: '', price_cents: 1999, stock: 3, image_url: null, is_active: true, ...overrides,
});
const page = (data: Product[], meta = { current_page: 1, last_page: 1, per_page: 12, total: data.length }) => ({ data, meta });

describe('CatalogPage', () => {
  let http: HttpTestingController;

  beforeEach(() => ({ http } = setup()));
  afterEach(() => http.verify());

  async function open(url = '/') {
    const view = await visit(url);
    http.expectOne('/api/v1/categories').flush({ data: [{ id: 1, name: 'Books', slug: 'books' }] });
    return view;
  }

  it('lists products with prices formatted from cents', async () => {
    const { harness, el } = await open();
    http.expectOne((r) => r.url === '/api/v1/products').flush(page([product(1), product(2, { stock: 0, name: 'Gone' })]));
    await settle(harness);

    expect(el.querySelectorAll('ul li').length).toBe(2);
    expect(text(el)).toContain('$19.99');
    expect(text(byText(el, 'li', 'Gone'))).toContain('Sold out');
  });

  it('sends the filters from the URL to the API', async () => {
    const { harness } = await open('/?q=lamp&category=books&sort=price_asc&page=2');
    const req = http.expectOne((r) => r.url === '/api/v1/products');

    expect(req.request.params.get('q')).toBe('lamp');
    expect(req.request.params.get('category')).toBe('books');
    expect(req.request.params.get('sort')).toBe('price_asc');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(page([]));
    await settle(harness);
  });

  it('choosing a category resets to page 1 and refetches', async () => {
    const { harness, el } = await open('/?page=3');
    http.expectOne((r) => r.url === '/api/v1/products').flush(page([product(1)], { current_page: 3, last_page: 3, per_page: 12, total: 30 }));
    await settle(harness);

    byText(el, 'button', 'Books')!.click();
    await settle(harness);

    const req = http.expectOne((r) => r.url === '/api/v1/products');
    expect(req.request.params.get('category')).toBe('books');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([]));
    await settle(harness);
    expect(TestBed.inject(Router).url).toBe('/?category=books');
  });

  it('shows an empty state that clears the filters', async () => {
    const { harness, el } = await open('/?q=zzz');
    http.expectOne((r) => r.url === '/api/v1/products').flush(page([]));
    await settle(harness);

    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it('shows the error with a retry when the API is down', async () => {
    const { harness, el } = await open();
    http.expectOne((r) => r.url === '/api/v1/products').error(new ProgressEvent('offline'));
    await settle(harness);

    expect(text(el.querySelector('[role="alert"]'))).toContain('Could not reach the server');
    byText(el, 'button', 'Try again')!.click();
    await settle(harness);
    http.expectOne((r) => r.url === '/api/v1/products').flush(page([product(1)]));
  });
});

import { Router } from '@angular/router';
