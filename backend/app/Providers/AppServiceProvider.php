<?php

namespace App\Providers;

use App\Application\Payments\PaymentGateway;
use App\Infrastructure\Payments\FakeGateway;
use App\Infrastructure\Payments\StripeGateway;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Stripe\StripeClient;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, function () {
            if ($secret = config('services.stripe.secret')) {
                return new StripeGateway(new StripeClient($secret));
            }
            // Fake payments in production would mean free orders through the simulate endpoint.
            abort_if($this->app->isProduction(), 503, 'Payments are not configured.');

            return new FakeGateway;
        });
    }

    public function boot(): void
    {
        Gate::define('admin', fn (User $user) => $user->isAdmin());

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
    }
}
