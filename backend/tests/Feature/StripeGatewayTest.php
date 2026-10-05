<?php

namespace Tests\Feature;

use App\Infrastructure\Payments\StripeGateway;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;
use Stripe\StripeClient;
use Tests\TestCase;

/** The adapter against the real Stripe SDK, with only the HTTP transport replaced. */
class StripeGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        ApiRequestor::setHttpClient(null);
        parent::tearDown();
    }

    public function test_creates_a_checkout_session_with_server_side_amounts(): void
    {
        $transport = new class implements ClientInterface
        {
            public array $calls = [];

            public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
            {
                $this->calls[] = compact('method', 'absUrl', 'headers', 'params');

                return [json_encode(['id' => 'cs_test_42', 'object' => 'checkout.session', 'url' => 'https://checkout.stripe.com/c/cs_test_42']), 200, []];
            }
        };
        ApiRequestor::setHttpClient($transport);

        $order = Order::factory()->create(['shipping_cents' => 990, 'total_cents' => 3490]);
        $order->items()->create(['product_id' => Product::factory()->create()->id, 'product_name' => 'Lamp', 'unit_price_cents' => 1250, 'quantity' => 2, 'line_total_cents' => 2500]);

        $result = (new StripeGateway(new StripeClient('sk_test_x')))->createCheckout($order->load('items'));

        $this->assertSame(['ref' => 'cs_test_42', 'checkout_url' => 'https://checkout.stripe.com/c/cs_test_42'], $result);
        $call = $transport->calls[0];
        $this->assertSame('post', $call['method']);
        $this->assertStringEndsWith('/v1/checkout/sessions', $call['absUrl']);
        $this->assertSame('payment', $call['params']['mode']);
        $this->assertSame((string) $order->id, $call['params']['metadata']['order_id']);
        $this->assertSame(1250, $call['params']['line_items'][0]['price_data']['unit_amount']);
        $this->assertSame(2, $call['params']['line_items'][0]['quantity']);
        $this->assertSame(990, $call['params']['line_items'][1]['price_data']['unit_amount']); // shipping line
        $this->assertContains("Idempotency-Key: order-{$order->id}-0", $call['headers']);
    }
}
