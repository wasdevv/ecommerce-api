<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_only_active_products_with_pagination_meta(): void
    {
        Product::factory()->count(3)->create();
        Product::factory()->inactive()->create();
        Product::factory()->create()->delete();

        $this->getJson('/api/v1/products?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_search_does_not_leak_inactive_products_through_the_or(): void
    {
        Product::factory()->create(['name' => 'Blue Lamp', 'description' => 'x']);
        Product::factory()->inactive()->create(['name' => 'Hidden', 'description' => 'a lamp too']);

        $this->getJson('/api/v1/products?q=lamp')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Blue Lamp');
    }

    public function test_search_treats_like_wildcards_literally(): void
    {
        Product::factory()->create(['name' => 'Anything', 'description' => 'x']);

        $this->getJson('/api/v1/products?q=%25')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_filters_by_category_and_price_range(): void
    {
        $books = Category::factory()->create(['slug' => 'books']);
        Product::factory()->create(['category_id' => $books->id, 'price_cents' => 1000]);
        Product::factory()->create(['category_id' => $books->id, 'price_cents' => 5000]);
        Product::factory()->create(['price_cents' => 1000]);

        $this->getJson('/api/v1/products?category=books&max_price=2000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.price_cents', 1000);
    }

    public function test_unknown_category_is_422(): void
    {
        $this->getJson('/api/v1/products?category=nope')->assertUnprocessable();
    }

    public function test_show_by_slug_and_404_for_inactive(): void
    {
        $product = Product::factory()->create();
        $inactive = Product::factory()->inactive()->create();

        $this->getJson("/api/v1/products/{$product->slug}")->assertOk()->assertJsonPath('data.id', $product->id);
        $this->getJson("/api/v1/products/{$inactive->slug}")->assertNotFound();
    }
}
