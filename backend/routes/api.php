<?php

use App\Http\Controllers\Api\V1\AdminProductController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
    });

    Route::middleware('throttle:api')->group(function () {
        Route::get('categories', [CatalogController::class, 'categories']);
        Route::get('products', [CatalogController::class, 'index']);
        Route::get('products/{slug}', [CatalogController::class, 'show']);
    });

    Route::post('webhooks/stripe', [PaymentController::class, 'stripeWebhook']);

    Route::middleware(['auth:api', 'throttle:api'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/refresh', [AuthController::class, 'refresh']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('cart', [CartController::class, 'show']);
        Route::put('cart/items/{productId}', [CartController::class, 'put'])->whereNumber('productId');
        Route::delete('cart/items/{productId}', [CartController::class, 'destroy'])->whereNumber('productId');

        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store'])->middleware('throttle:checkout');
        Route::get('orders/{order}', [OrderController::class, 'show']);
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->middleware('throttle:checkout');
        Route::post('orders/{order}/payments/simulate', [PaymentController::class, 'simulate']);

        Route::middleware('can:admin')->prefix('admin')->group(function () {
            Route::get('products', [AdminProductController::class, 'index']);
            Route::post('products', [AdminProductController::class, 'store']);
            Route::patch('products/{product}', [AdminProductController::class, 'update'])->withTrashed();
            Route::delete('products/{product}', [AdminProductController::class, 'destroy']);
        });
    });
});
