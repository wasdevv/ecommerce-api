# E-commerce API

A store backend in **Laravel 13 / PHP 8.3** with an **Angular 22** storefront: catalog, JWT auth, a server-side cart, a transactional checkout that can't oversell, and payments through **Stripe Checkout** with a verified, idempotent webhook. PostgreSQL, Redis for cache/queue/rate limiting, everything runs with one `docker compose up`.

```
frontend/   Angular 22 (standalone, zoneless, signals) + Tailwind v4, served by nginx (which also proxies /api)
backend/    Laravel 13 API, /api/v1, OpenAPI spec in backend/openapi.yaml
compose.yaml  postgres · redis · migrate (one-shot) · api (FrankenPHP) · worker · web
```

## Run it

Requires Docker only. For frontend work outside Docker: Node 22.22.3+ or 24, `cd frontend && npm ci && npm start` (dev server on :3000, proxying `/api` to :8000).

```bash
cp .env.example .env
sed -i "s|^APP_KEY=$|APP_KEY=base64:$(openssl rand -base64 32)|" .env
sed -i "s|^JWT_SECRET=$|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
sed -i "s|^DEMO_PASSWORD=$|DEMO_PASSWORD=pick-one|" .env   # optional demo accounts

docker compose up --build -d
```

- Storefront: http://localhost:3000
- API: http://localhost:8000/api/v1 (health: `/up`)
- With `DEMO_PASSWORD` set, the seed creates `admin@example.com` and `customer@example.com` with that password. There is no default credential.

Migrations and the (idempotent) seed run once in the `migrate` service before `api` and `worker` start, never concurrently from each replica.

### Payments: two modes

| `STRIPE_SECRET_KEY` | `APP_ENV` | Behaviour |
|---|---|---|
| set | any | **Stripe Checkout.** "Pay now" redirects to Stripe's hosted page; the order turns `paid` when the webhook arrives. |
| empty | `local` (compose default) | **Local mode.** A fake gateway plus `POST /orders/{id}/payments/simulate`, which runs the same state transition as the webhook. |
| empty | `production` | Payment start returns **503**. Faking payments in production would mean free orders. |

To use Stripe test mode: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then forward events with `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`.

## Tests

```bash
docker compose --profile test run --rm test          # backend: PHPUnit against PostgreSQL
cd frontend && npm ci && npm run test:ci             # frontend: Jasmine in headless Chrome via Karma
```

### Backend

43 PHPUnit tests run against **real PostgreSQL** (not SQLite: row locks and `ilike` are part of what they prove). Line coverage measured with PCOV is **97%**; CI enforces a floor of 85%.

What they pin down, beyond the happy paths:

- **No overselling under concurrency.** `ConcurrentCheckoutTest` forks two processes with separate DB connections racing for the last unit, five rounds: exactly one order, stock ends at 0, the loser gets a clean `422 insufficient_stock`. Removing `lockForUpdate()` makes it fail (verified: the `CHECK (stock >= 0)` constraint fires instead).
- **All-or-nothing checkout.** One unavailable item rolls back the order, the stock of the other items and the cart clearing, and no confirmation email is queued.
- **Prices belong to the server.** The order snapshots name and unit price at checkout; later product edits don't touch it; `total_cents`/`discount_cents` sent by the client are ignored.
- **Webhook safety.** Bad signature → 400; the same event delivered twice is processed once (unique index on the event id, in the same transaction as the handling); amount mismatch doesn't mark the order paid; a payment for a cancelled order doesn't revive it; `expired` followed by a late `completed` still records the money.
- **Auth.** Expired, garbage and revoked (post-logout) tokens are 401; a customer can't reach admin routes or someone else's order; `role` can't be self-assigned at signup.
- **Stripe adapter.** Exercised through the real SDK with only the HTTP transport swapped, asserting the exact session payload (amounts in cents, shipping line, idempotency key).

### Frontend

34 Jasmine specs run by Karma in headless Chrome, with line coverage at **97%**. They go through the real router, the real HTTP interceptor and the real components; only the network is faked (`HttpTestingController`), so each spec asserts the exact request the UI sends and how it renders the API's answer:

- **Session:** the bearer token goes on every call, a 401 on a token we sent clears the session, the guard sends anonymous users to `/login?returnUrl=...`, and login never follows a `returnUrl` to another site.
- **Money stays the server's:** checkout posts only the address (no totals, no prices), and cart totals render the numbers the API computed, also after a refused quantity change.
- **Errors where they belong:** 422 validation messages sit under their field, business-rule refusals (`insufficient_stock`, `order_not_cancellable`) show as a banner, and when the network is down the page offers a retry.
- **Payment:** with Stripe configured the buyer is redirected to the hosted checkout. In local mode the simulated payment is offered. Back from Stripe, the order polls until the webhook lands, then stops (`jasmine.clock`).

The specs caught two real bugs before anything shipped: the route guard called `inject()` after an `await` (outside the injection context, so protected routes never redirected to login), and a resource in an error state threw when read, which would have crashed the catalog instead of showing its retry.

CI (`.github/workflows/ci.yml`): Pint, backend tests with coverage, OpenAPI lint, Karma specs and frontend build, and a `docker compose build`.

## Design decisions

**Layers, kept honest.** HTTP stays at the edge (`app/Http`: controllers, form requests, resources, policy). Business rules live in `app/Application` as small use cases (`PlaceOrder`, `CancelOrder`, `StartPayment`, `RecordPaymentResult`) that don't know about requests or responses. The payment provider is a port (`PaymentGateway`) with two adapters in `app/Infrastructure` (Stripe, Fake). Eloquent models are used directly by the use cases: a repository interface wrapping Eloquent CRUD one-to-one would add a file per model and remove nothing, so the abstraction exists only where there is a second implementation.

**Money is integer cents** in the database, the API and the arithmetic. No float ever decides a total; the frontend only formats.

**Checkout** (`PlaceOrder`) runs in one transaction: read the cart, `SELECT ... FOR UPDATE` the products **in ascending id order** (two buyers with overlapping carts can't deadlock), verify active + stock, snapshot lines, decrement, create the order, empty the cart. The order number is derived from the primary key, so it is unique by construction with no retry loop. The confirmation email is a queued notification with `afterCommit`, so a rolled-back order never sends one.

**Cancellation** re-reads the order under a row lock, so two concurrent cancels restock exactly once.

**One cart, on the server.** The cart is a table, not `localStorage`; it follows the user across devices and the totals shown are the ones the checkout will charge.

**Auth** is a single mechanism: JWT (`php-open-source-saver/jwt-auth`), 60-minute TTL, refresh endpoint, logout blacklists the token in Redis. Rate limits: 10/min on login/register per IP, 10/min on checkout and payment start per user, 120/min elsewhere.

**Same origin.** nginx serves the SPA and proxies `/api` to the API, so there's no CORS surface and the token never crosses origins. `ng serve` does the same through `proxy.conf.json`.

**Frontend shape.** Standalone components, signals and zoneless change detection. Reads use `httpResource`, so loading, error and retry come from the resource, not hand-written flags. Writes go through `HttpClient`, and every cart mutation renders the cart the server answers with. One functional interceptor adds the token and handles 401; one guard protects the account pages; routes are lazy-loaded (initial bundle ~86 kB gzipped). The URL holds the catalog filters, so a search survives refresh and can be shared.

## API

Full contract in [`backend/openapi.yaml`](backend/openapi.yaml) (OpenAPI 3.1, linted in CI). Summary:

| Method | Path | Auth |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | public, throttled |
| GET / POST | `/auth/me`, `/auth/refresh`, `/auth/logout` | bearer |
| GET | `/categories`, `/products?q=&category=&min_price=&max_price=&sort=&per_page=`, `/products/{slug}` | public |
| GET / PUT / DELETE | `/cart`, `/cart/items/{productId}` | bearer |
| GET / POST | `/orders`, `/orders/{id}`, `/orders/{id}/cancel` | bearer, owner (admin can read) |
| POST | `/orders/{id}/payments`, `/orders/{id}/payments/simulate` | bearer, owner |
| POST | `/webhooks/stripe` | Stripe signature |
| GET / POST / PATCH / DELETE | `/admin/products[/{id}]` | bearer, admin |

Errors: `401` unauthenticated, `403` forbidden, `404` not found, `422` with `errors` (validation) or `code` + `details` (business rule, e.g. `insufficient_stock` lists each item with requested and available quantity), `429` rate limited.

## Limits, stated plainly

- **Not deployed.** There is no live URL. The compose stack is the reference environment; a real deploy needs `APP_ENV=production`, Stripe keys, a real mail driver and TLS in front.
- **Refunds are manual.** A payment that succeeds for an order cancelled in the meantime is recorded and logged (`payment.succeeded_for_non_pending_order`), not refunded automatically.
- **Order status after Stripe redirect is polled** (every 3 s, up to a minute) rather than pushed. No WebSocket/SSE.
- **No admin UI.** Product management is API-only (`/admin/products`).
- **Product images** are placeholder photos from picsum.photos, not product shots.
- Not included, because nothing here would exercise them yet: S3 uploads, read replicas, Horizon, Sentry, discounts/coupons, tax.

## License

MIT
