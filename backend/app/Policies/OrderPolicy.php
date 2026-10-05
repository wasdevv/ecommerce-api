<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $user->isAdmin() || $order->user_id === $user->id;
    }

    /** Only the buyer cancels or pays their own order. */
    public function act(User $user, Order $order): bool
    {
        return $order->user_id === $user->id;
    }
}
