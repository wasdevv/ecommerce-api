<?php

return [
    'currency' => env('SHOP_CURRENCY', 'usd'),
    'shipping_cents' => (int) env('SHOP_SHIPPING_CENTS', 990),
    'free_shipping_from_cents' => (int) env('SHOP_FREE_SHIPPING_FROM_CENTS', 10000),
    // Where Stripe sends the buyer back after the hosted checkout.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
];
