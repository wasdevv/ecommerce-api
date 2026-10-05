<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Checkout\PlaceOrder;
use App\Application\Orders\CancelOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection($request->user()->orders()->orderByDesc('id')->paginate(10));
    }

    public function store(CheckoutRequest $request, PlaceOrder $placeOrder): JsonResponse
    {
        $order = $placeOrder($request->user(), $request->validated('shipping_address'));

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    public function show(Order $order): OrderResource
    {
        $this->authorize('view', $order);

        return new OrderResource($order->load('items'));
    }

    public function cancel(Order $order, CancelOrder $cancelOrder): OrderResource
    {
        $this->authorize('act', $order);

        return new OrderResource($cancelOrder($order)->load('items'));
    }
}
