<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Idempotent: safe to run on every deploy. Stock is only set when the product is first created. */
class DatabaseSeeder extends Seeder
{
    private const CATALOG = [
        'Electronics' => [
            ['Noise-Cancelling Headphones', 24900, 'Over-ear, 30h battery, USB-C fast charge.'],
            ['Mechanical Keyboard', 12900, 'Hot-swappable switches, aluminium case, 75% layout.'],
            ['4K Webcam', 15900, 'Auto-framing, dual microphones, privacy shutter.'],
            ['Wireless Mouse', 4900, 'Silent clicks, 70-day battery, three paired devices.'],
            ['USB-C Dock', 18900, 'Two displays, 100W passthrough, gigabit ethernet.'],
            ['Portable SSD 1TB', 10900, '1050 MB/s, drop resistant, works with phones.'],
        ],
        'Home & Kitchen' => [
            ['Pour-Over Coffee Set', 5900, 'Glass carafe, steel dripper, reusable filter.'],
            ['Cast Iron Skillet', 3900, 'Pre-seasoned 26cm skillet, oven safe.'],
            ['Chef Knife', 8900, '20cm high-carbon steel, full tang.'],
            ['Linen Throw Blanket', 6900, 'Stonewashed linen, 130x170cm.'],
        ],
        'Books' => [
            ['Designing Data-Intensive Applications', 4500, 'The reference on distributed data systems.'],
            ['Clean Architecture', 3500, 'Boundaries, dependency rule and component design.'],
            ['Refactoring', 4200, 'Improving the design of existing code, second edition.'],
            ['The Pragmatic Programmer', 3900, '20th anniversary edition.'],
        ],
        'Sports' => [
            ['Yoga Mat', 2900, '6mm natural rubber, non-slip surface.'],
            ['Adjustable Dumbbells', 29900, 'From 2 to 24kg in one pair.'],
            ['Running Belt', 1900, 'Fits phones up to 6.9", sweat resistant.'],
            ['Insulated Bottle', 2500, '750ml, keeps cold for 24h.'],
        ],
    ];

    public function run(): void
    {
        foreach (self::CATALOG as $categoryName => $products) {
            $category = Category::updateOrCreate(['slug' => Str::slug($categoryName)], ['name' => $categoryName]);

            foreach ($products as $i => [$name, $price, $description]) {
                $product = Product::withTrashed()->firstOrNew(['slug' => Str::slug($name)]);
                $product->fill([
                    'category_id' => $category->id,
                    'name' => $name,
                    'description' => $description,
                    'price_cents' => $price,
                    'image_url' => 'https://picsum.photos/seed/'.Str::slug($name).'/600/450',
                ]);
                if (! $product->exists) {
                    $product->stock = 5 + ($i * 7) % 40;
                }
                $product->save();
            }
        }

        // Demo accounts only exist when a password is provided: there is no default credential to leak.
        if ($password = env('DEMO_PASSWORD')) {
            User::updateOrCreate(['email' => 'admin@example.com'], ['name' => 'Demo Admin', 'password' => $password])->forceFill(['role' => 'admin'])->save();
            User::updateOrCreate(['email' => 'customer@example.com'], ['name' => 'Demo Customer', 'password' => $password]);
        }
    }
}
