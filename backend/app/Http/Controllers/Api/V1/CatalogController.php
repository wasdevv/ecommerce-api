<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogController extends Controller
{
    public function categories(): AnonymousResourceCollection
    {
        return CategoryResource::collection(Category::query()->orderBy('name')->get());
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'exists:categories,slug'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'sort' => ['nullable', 'in:newest,price_asc,price_desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $products = Product::query()
            ->available()
            ->with('category')
            // Grouped so the OR never escapes the "active only" condition.
            ->when($filters['q'] ?? null, fn (Builder $q, string $term) => $q->where(function (Builder $q) use ($term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where('name', 'ilike', $like)->orWhere('description', 'ilike', $like);
            }))
            ->when($filters['category'] ?? null, fn (Builder $q, string $slug) => $q->whereRelation('category', 'slug', $slug))
            ->when(isset($filters['min_price']), fn (Builder $q) => $q->where('price_cents', '>=', $filters['min_price']))
            ->when(isset($filters['max_price']), fn (Builder $q) => $q->where('price_cents', '<=', $filters['max_price']))
            ->tap(fn (Builder $q) => match ($filters['sort'] ?? 'newest') {
                'price_asc' => $q->orderBy('price_cents'),
                'price_desc' => $q->orderByDesc('price_cents'),
                default => $q->orderByDesc('created_at'),
            })
            ->orderByDesc('id') // tie-breaker: deterministic pagination
            ->paginate($filters['per_page'] ?? 12)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function show(string $slug): ProductResource
    {
        return new ProductResource(Product::query()->available()->with('category')->where('slug', $slug)->firstOrFail());
    }
}
