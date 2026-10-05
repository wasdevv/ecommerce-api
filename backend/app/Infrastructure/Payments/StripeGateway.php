<?php

namespace App\Infrastructure\Payments;

use App\Application\Payments\PaymentGateway;
use App\Models\Order;
use Stripe\StripeClient;

/** Stripe hosted Checkout: card data never touches this app or its frontend. */
final class StripeGateway implements PaymentGateway
{
    public function __construct(private StripeClient $stripe) {}

    public function name(): string
    {
        return 'stripe';
    }

    public function createCheckout(Order $order): array
    {
        $frontend = rtrim(config('shop.frontend_url'), '/');
        $currency = config('shop.currency');

        $lineItems = $order->items->map(fn ($item) => [
            'quantity' => $item->quantity,
            'price_data' => [
                'currency' => $currency,
                'unit_amount' => $item->unit_price_cents,
                'product_data' => ['name' => $item->product_name],
            ],
        ])->all();

        if ($order->shipping_cents > 0) {
            $lineItems[] = [
                'quantity' => 1,
                'price_data' => ['currency' => $currency, 'unit_amount' => $order->shipping_cents, 'product_data' => ['name' => 'Shipping']],
            ];
        }

        $session = $this->stripe->checkout->sessions->create([
            'mode' => 'payment',
            'line_items' => $lineItems,
            'client_reference_id' => (string) $order->id,
            'metadata' => ['order_id' => (string) $order->id],
            'success_url' => "{$frontend}/orders/{$order->id}?checkout=success",
            'cancel_url' => "{$frontend}/orders/{$order->id}?checkout=cancelled",
        ], ['idempotency_key' => "order-{$order->id}-".$order->payments()->count()]);

        return ['ref' => $session->id, 'checkout_url' => $session->url];
    }
}
