<?php

namespace App\Application\Checkout;

final class Shipping
{
    public static function forSubtotal(int $subtotalCents): int
    {
        return $subtotalCents >= config('shop.free_shipping_from_cents') ? 0 : config('shop.shipping_cents');
    }
}
