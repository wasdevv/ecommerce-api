<?php

namespace App\Application\Orders;

use App\Domain\Enums\OrderStatus;
use App\Domain\Exceptions\BusinessRuleViolation;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

final class CancelOrder
{
    public function __invoke(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            // Re-read under lock: two cancels racing must restock exactly once.
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($order->status !== OrderStatus::Pending) {
                throw new BusinessRuleViolation('order_not_cancellable', "A {$order->status->value} order cannot be cancelled.");
            }

            foreach ($order->items()->orderBy('product_id')->get() as $item) {
                Product::withTrashed()->whereKey($item->product_id)->increment('stock', $item->quantity);
            }

            $order->update(['status' => OrderStatus::Cancelled, 'cancelled_at' => now()]);

            return $order;
        });
    }
}
