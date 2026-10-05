<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return [
            'category_id' => Category::factory()->create()->id,
            'name' => 'Desk Lamp', 'slug' => 'desk-lamp', 'description' => 'Warm light.',
            'price_cents' => 3990, 'stock' => 5,
        ];
    }

    public function test_customer_cannot_manage_products(): void
    {
        $this->asUser(User::factory()->create())->postJson('/api/v1/admin/products', $this->payload())->assertForbidden();
    }

    public function test_anonymous_cannot_manage_products(): void
    {
        $this->postJson('/api/v1/admin/products', $this->payload())->assertUnauthorized();
    }

    public function test_admin_creates_updates_and_deletes(): void
    {
        $this->asUser(User::factory()->admin()->create());

        $id = $this->postJson('/api/v1/admin/products', $this->payload())->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/admin/products/{$id}", ['price_cents' => 2990])->assertOk()->assertJsonPath('data.price_cents', 2990);
        $this->deleteJson("/api/v1/admin/products/{$id}")->assertNoContent();

        $this->assertSoftDeleted('products', ['id' => $id]);
    }

    public function test_validation_rejects_negative_stock_and_float_price(): void
    {
        $this->asUser(User::factory()->admin()->create())
            ->postJson('/api/v1/admin/products', ['stock' => -1, 'price_cents' => 9.99] + $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['stock', 'price_cents']);
    }

    public function test_slug_must_be_unique(): void
    {
        Product::factory()->create(['slug' => 'desk-lamp']);

        $this->asUser(User::factory()->admin()->create())
            ->postJson('/api/v1/admin/products', $this->payload())
            ->assertJsonValidationErrors(['slug']);
    }
}
