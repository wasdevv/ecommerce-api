<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminProductController extends Controller
{
    /** Admin view of the catalog, inactive products included. */
    public function index(): AnonymousResourceCollection
    {
        return ProductResource::collection(Product::query()->with('category')->orderByDesc('id')->paginate(50));
    }

    public function store(ProductRequest $request): JsonResponse
    {
        return (new ProductResource(Product::create($request->validated())->load('category')))->response()->setStatusCode(201);
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product->load('category'));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete(); // soft delete: past orders still reference it

        return response()->json(null, 204);
    }
}
