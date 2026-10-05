<?php

namespace App\Application\Payments;

use App\Models\Order;

/** Port to the payment provider. Stripe in production, Fake when no key is configured. */
interface PaymentGateway
{
    public function name(): string;

    /** @return array{ref: string, checkout_url: ?string} */
    public function createCheckout(Order $order): array;
}
