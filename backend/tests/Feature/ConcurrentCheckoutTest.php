<?php

namespace Tests\Feature;

use App\Application\Checkout\PlaceOrder;
use App\Domain\Exceptions\BusinessRuleViolation;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Two real processes, two real PostgreSQL connections, committed data:
 * the only way to prove SELECT ... FOR UPDATE, which a single test transaction can't.
 */
class ConcurrentCheckoutTest extends TestCase
{
    use DatabaseTruncation;

    private const ADDRESS = ['name' => 'A', 'street' => 'S', 'city' => 'C', 'zip' => 'Z', 'country' => 'BR'];

    public function test_two_buyers_racing_for_the_last_unit_produce_exactly_one_order(): void
    {
        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is required to race two processes.');
        }
        Notification::fake();

        for ($round = 0; $round < 5; $round++) {
            $product = Product::factory()->create(['stock' => 1]);
            [$a, $b] = User::factory()->count(2)->create()->all();
            foreach ([$a, $b] as $user) {
                CartItem::create(['user_id' => $user->id, 'product_id' => $product->id, 'quantity' => 1]);
            }
            $startAt = microtime(true) + 0.3;

            $pid = pcntl_fork();
            if ($pid === 0) {
                DB::purge();
                exit($this->attempt($b, $startAt));
            }
            $mine = $this->attempt($a, $startAt);
            pcntl_waitpid($pid, $status);
            $theirs = pcntl_wexitstatus($status);

            $outcomes = [$mine, $theirs];
            sort($outcomes);
            $this->assertSame([0, 1], $outcomes, 'one buyer wins, the other gets a clean insufficient_stock (not a crash)');
            $this->assertSame(0, $product->fresh()->stock);
            $this->assertSame(1, Order::query()->whereHas('items', fn ($q) => $q->where('product_id', $product->id))->count());
        }
    }

    /** 0 = order placed, 1 = business rule refusal, 2 = anything else. */
    private function attempt(User $user, float $startAt): int
    {
        time_sleep_until($startAt);
        try {
            app(PlaceOrder::class)($user, self::ADDRESS);

            return 0;
        } catch (BusinessRuleViolation) {
            return 1;
        } catch (\Throwable $e) {
            fwrite(STDERR, $e->getMessage());

            return 2;
        }
    }
}
