<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Checkout\Shipping;
use App\Domain\Exceptions\BusinessRuleViolation;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $items = $request->user()->cartItems()->with('product.category')->orderBy('id')->get()
            // A product deactivated or deleted after being added drops out of the cart view.
            ->filter(fn ($item) => $item->product?->is_active)
            ->values();

        $subtotal = $items->sum(fn ($item) => $item->product->price_cents * $item->quantity);
        $shipping = $items->isEmpty() ? 0 : Shipping::forSubtotal($subtotal);

        return response()->json(['data' => [
            'items' => $items->map(fn ($item) => [
                'product' => new ProductResource($item->product),
                'quantity' => $item->quantity,
                'line_total_cents' => $item->product->price_cents * $item->quantity,
            ]),
            'subtotal_cents' => $subtotal,
            'shipping_cents' => $shipping,
            'total_cents' => $subtotal + $shipping,
            'currency' => config('shop.currency'),
        ]]);
    }

    /** Sets the quantity of a product in the cart (idempotent PUT). */
    public function put(Request $request, int $productId): JsonResponse
    {
        $quantity = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:99']])['quantity'];

        $product = Product::query()->available()->findOrFail($productId);
        if ($product->stock < $quantity) {
            throw new BusinessRuleViolation('insufficient_stock', "Only {$product->stock} left in stock.", ['available' => $product->stock]);
        }

        $request->user()->cartItems()->updateOrCreate(['product_id' => $product->id], ['quantity' => $quantity]);

        return $this->show($request);
    }

    public function destroy(Request $request, int $productId): JsonResponse
    {
        $request->user()->cartItems()->where('product_id', $productId)->delete();

        return $this->show($request);
    }
}
