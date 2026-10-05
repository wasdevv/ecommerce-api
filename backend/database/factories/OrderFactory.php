<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'number' => 'ORD-'.fake()->unique()->numerify('########-######'),
            'status' => 'pending',
            'subtotal_cents' => 1000,
            'shipping_cents' => 990,
            'total_cents' => 1990,
            'shipping_address' => ['name' => 'Ana', 'street' => 'Rua A', 'city' => 'SP', 'zip' => '01000', 'country' => 'BR'],
        ];
    }
}
