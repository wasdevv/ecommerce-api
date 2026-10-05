<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    public function test_anonymous_has_no_cart(): void
    {
        $this->getJson('/api/v1/cart')->assertUnauthorized();
    }

    public function test_put_sets_quantity_and_computes_totals_server_side(): void
    {
        $product = Product::factory()->create(['price_cents' => 2500, 'stock' => 10]);
        $this->asUser(User::factory()->create());

        $this->putJson("/api/v1/cart/items/{$product->id}", ['quantity' => 2])->assertOk();
        $this->putJson("/api/v1/cart/items/{$product->id}", ['quantity' => 3])
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.quantity', 3)
            ->assertJsonPath('data.subtotal_cents', 7500)
            ->assertJsonPath('data.shipping_cents', 990)
            ->assertJsonPath('data.total_cents', 8490);
    }

    public function test_free_shipping_from_threshold(): void
    {
        $product = Product::factory()->create(['price_cents' => 10000]);

        $this->asUser(User::factory()->create())
            ->putJson("/api/v1/cart/items/{$product->id}", ['quantity' => 1])
            ->assertJsonPath('data.shipping_cents', 0);
    }

    public function test_rejects_inactive_product_and_quantity_above_stock(): void
    {
        $inactive = Product::factory()->inactive()->create();
        $scarce = Product::factory()->create(['stock' => 1]);
        $this->asUser(User::factory()->create());

        $this->putJson("/api/v1/cart/items/{$inactive->id}", ['quantity' => 1])->assertNotFound();
        $this->putJson("/api/v1/cart/items/{$scarce->id}", ['quantity' => 2])->assertUnprocessable()->assertJsonPath('code', 'insufficient_stock');
        $this->putJson("/api/v1/cart/items/{$scarce->id}", ['quantity' => 0])->assertJsonValidationErrors(['quantity']);
    }

    public function test_remove_item(): void
    {
        $product = Product::factory()->create();
        $this->asUser(User::factory()->create());
        $this->putJson("/api/v1/cart/items/{$product->id}", ['quantity' => 1]);

        $this->deleteJson("/api/v1/cart/items/{$product->id}")->assertOk()->assertJsonCount(0, 'data.items');
    }
}
