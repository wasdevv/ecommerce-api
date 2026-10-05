<?php

namespace App\Infrastructure\Payments;

use App\Application\Payments\PaymentGateway;
use App\Models\Order;
use Illuminate\Support\Str;

/** Local mode when STRIPE_SECRET_KEY is empty: the payment is confirmed through the simulate endpoint. */
final class FakeGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'fake';
    }

    public function createCheckout(Order $order): array
    {
        return ['ref' => 'fake_'.Str::ulid(), 'checkout_url' => null];
    }
}
