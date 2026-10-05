<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderPlaced;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private array $address = ['name' => 'Ana', 'street' => 'Rua A, 1', 'city' => 'São Paulo', 'zip' => '01310-100', 'country' => 'BR'];

    private function cart(User $user, Product $product, int $quantity): void
    {
        CartItem::create(['user_id' => $user->id, 'product_id' => $product->id, 'quantity' => $quantity]);
    }

    public function test_places_order_snapshots_lines_decrements_stock_and_empties_cart(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $a = Product::factory()->create(['price_cents' => 1999, 'stock' => 5]);
        $b = Product::factory()->create(['price_cents' => 500, 'stock' => 2]);
        $this->cart($user, $a, 2);
        $this->cart($user, $b, 2);

        $this->asUser($user)->postJson('/api/v1/orders', ['shipping_address' => $this->address])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.subtotal_cents', 4998)
            ->assertJsonPath('data.shipping_cents', 990)
            ->assertJsonPath('data.total_cents', 5988)
            ->assertJsonCount(2, 'data.items');

        $this->assertSame(3, $a->fresh()->stock);
        $this->assertSame(0, $b->fresh()->stock);
        $this->assertSame(0, $user->cartItems()->count());
        $this->assertMatchesRegularExpression('/^ORD-\d{8}-\d{6}$/', Order::first()->number);
        Notification::assertSentTo($user, OrderPlaced::class);
    }

    public function test_empty_cart_is_422(): void
    {
        $this->asUser(User::factory()->create())
            ->postJson('/api/v1/orders', ['shipping_address' => $this->address])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'cart_empty');
    }

    public function test_insufficient_stock_rolls_back_everything(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $plenty = Product::factory()->create(['stock' => 10]);
        $scarce = Product::factory()->create(['stock' => 1]);
        $this->cart($user, $plenty, 3);
        $this->cart($user, $scarce, 1);
        $scarce->update(['stock' => 0]); // someone else bought the last unit after it was carted

        $this->asUser($user)->postJson('/api/v1/orders', ['shipping_address' => $this->address])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'insufficient_stock')
            ->assertJsonPath('details.items.0.product_id', $scarce->id);

        $this->assertSame(10, $plenty->fresh()->stock);
        $this->assertSame(0, Order::count());
        $this->assertSame(2, $user->cartItems()->count());
        Notification::assertNothingSent();
    }

    public function test_product_deactivated_after_carting_cannot_be_bought(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        $this->cart($user, $product, 1);
        $product->update(['is_active' => false]);

        $this->asUser($user)->postJson('/api/v1/orders', ['shipping_address' => $this->address])
            ->assertJsonPath('code', 'insufficient_stock');
    }

    public function test_price_is_read_at_checkout_and_frozen_after(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price_cents' => 1000]);
        $this->cart($user, $product, 1);
        $product->update(['price_cents' => 1200]); // changed while in the cart

        $id = $this->asUser($user)->postJson('/api/v1/orders', ['shipping_address' => $this->address])
            ->assertJsonPath('data.items.0.unit_price_cents', 1200)->json('data.id');

        $originalName = $product->name;
        $product->update(['price_cents' => 9900, 'name' => 'Renamed']);

        $this->getJson("/api/v1/orders/{$id}")
            ->assertJsonPath('data.items.0.unit_price_cents', 1200)
            ->assertJsonPath('data.subtotal_cents', 1200)
            ->assertJsonPath('data.items.0.product_name', $originalName);
    }

    public function test_client_cannot_send_its_own_prices_or_discounts(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price_cents' => 1000]);
        $this->cart($user, $product, 1);

        $this->asUser($user)->postJson('/api/v1/orders', [
            'shipping_address' => $this->address, 'total_cents' => 1, 'discount_cents' => 999,
        ])->assertJsonPath('data.total_cents', 1990);
    }

    public function test_invalid_address_is_422(): void
    {
        $this->asUser(User::factory()->create())
            ->postJson('/api/v1/orders', ['shipping_address' => ['street' => 'x']])
            ->assertJsonValidationErrors(['shipping_address.city', 'shipping_address.country']);
    }

    public function test_orders_are_private_to_their_owner(): void
    {
        $owner = User::factory()->create();
        $order = Order::factory()->for($owner)->create();

        $this->asUser(User::factory()->create())->getJson("/api/v1/orders/{$order->id}")->assertForbidden();
        $this->asUser(User::factory()->create())->postJson("/api/v1/orders/{$order->id}/cancel")->assertForbidden();
        $this->asUser(User::factory()->admin()->create())->getJson("/api/v1/orders/{$order->id}")->assertOk();
        $this->asUser($owner)->getJson('/api/v1/orders')->assertJsonCount(1, 'data');
    }

    public function test_cancel_restocks_exactly_once(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['stock' => 4]);
        $this->cart($user, $product, 3);
        $this->asUser($user);
        $id = $this->postJson('/api/v1/orders', ['shipping_address' => $this->address])->json('data.id');
        $this->assertSame(1, $product->fresh()->stock);

        $this->postJson("/api/v1/orders/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->postJson("/api/v1/orders/{$id}/cancel")->assertUnprocessable()->assertJsonPath('code', 'order_not_cancellable');

        $this->assertSame(4, $product->fresh()->stock);
    }
}
