<?php

namespace App\Application\Checkout;

use App\Domain\Enums\OrderStatus;
use App\Domain\Exceptions\BusinessRuleViolation;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderPlaced;
use Illuminate\Support\Facades\DB;

/**
 * Turns the user's cart into an order. Everything happens in one transaction:
 * either the order exists, stock is decremented and the cart is empty, or nothing changed.
 */
final class PlaceOrder
{
    public function __invoke(User $user, array $shippingAddress): Order
    {
        $order = DB::transaction(function () use ($user, $shippingAddress) {
            $quantities = $user->cartItems()->pluck('quantity', 'product_id')->all();

            if ($quantities === []) {
                throw new BusinessRuleViolation('cart_empty', 'Your cart is empty.');
            }

            // Lock in ascending id order so two concurrent checkouts can't deadlock each other.
            $products = Product::query()
                ->whereKey(array_keys($quantities))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $unavailable = [];
            foreach ($quantities as $productId => $quantity) {
                $product = $products->get($productId);
                if (! $product || ! $product->is_active || $product->stock < $quantity) {
                    $unavailable[] = [
                        'product_id' => $productId,
                        'requested' => $quantity,
                        'available' => $product?->is_active ? $product->stock : 0,
                    ];
                }
            }
            if ($unavailable !== []) {
                throw new BusinessRuleViolation('insufficient_stock', 'Some items are no longer available in the requested quantity.', ['items' => $unavailable]);
            }

            $lines = [];
            $subtotal = 0;
            foreach ($quantities as $productId => $quantity) {
                $product = $products[$productId];
                $lineTotal = $product->price_cents * $quantity;
                $subtotal += $lineTotal;
                $lines[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price_cents' => $product->price_cents,
                    'quantity' => $quantity,
                    'line_total_cents' => $lineTotal,
                ];
                $product->decrement('stock', $quantity);
            }

            $shipping = Shipping::forSubtotal($subtotal);
            $order = $user->orders()->create([
                'status' => OrderStatus::Pending,
                'subtotal_cents' => $subtotal,
                'shipping_cents' => $shipping,
                'total_cents' => $subtotal + $shipping,
                'shipping_address' => $shippingAddress,
            ]);
            // Derived from the primary key, so unique by construction: no collision retry needed.
            $order->update(['number' => sprintf('ORD-%s-%06d', now()->format('Ymd'), $order->id)]);
            $order->items()->createMany($lines);
            $user->cartItems()->delete();

            return $order;
        });

        // Queued with afterCommit: never sent for an order that rolled back.
        $user->notify(new OrderPlaced($order));

        return $order->load('items');
    }
}
