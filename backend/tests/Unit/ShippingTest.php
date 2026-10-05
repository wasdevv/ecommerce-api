<?php

namespace Tests\Unit;

use App\Application\Checkout\Shipping;
use Tests\TestCase;

class ShippingTest extends TestCase
{
    public function test_threshold_is_inclusive(): void
    {
        $this->assertSame(990, Shipping::forSubtotal(9999));
        $this->assertSame(0, Shipping::forSubtotal(10000));
    }
}
