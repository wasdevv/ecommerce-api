<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private function pendingPayment(int $amount = 1990): Payment
    {
        $order = Order::factory()->create(['total_cents' => $amount]);

        return $order->payments()->create(['provider' => 'stripe', 'provider_ref' => 'cs_test_1', 'status' => 'pending', 'amount_cents' => $amount]);
    }

    /** Signs exactly like Stripe does: HMAC-SHA256 of "{timestamp}.{raw body}". */
    private function webhook(array $event, string $secret = 'whsec_test')
    {
        $body = json_encode($event);
        $t = time();
        $sig = hash_hmac('sha256', "{$t}.{$body}", $secret);

        return $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => "t={$t},v1={$sig}",
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
        ], $body);
    }

    private function completed(string $eventId, int $amount = 1990): array
    {
        return [
            'id' => $eventId, 'object' => 'event', 'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_test_1', 'object' => 'checkout.session', 'payment_status' => 'paid', 'amount_total' => $amount]],
        ];
    }

    public function test_local_mode_start_and_simulate_marks_the_order_paid(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create();
        $this->asUser($user);

        $this->postJson("/api/v1/orders/{$order->id}/payments")
            ->assertCreated()
            ->assertJsonPath('data.provider', 'fake')
            ->assertJsonPath('data.checkout_url', null);

        $this->postJson("/api/v1/orders/{$order->id}/payments/simulate")->assertOk()->assertJsonPath('data.status', 'paid');
        $this->postJson("/api/v1/orders/{$order->id}/payments")->assertUnprocessable()->assertJsonPath('code', 'order_not_payable');
    }

    public function test_production_without_stripe_refuses_instead_of_faking(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create();
        $this->app['env'] = 'production';

        $this->asUser($user)->postJson("/api/v1/orders/{$order->id}/payments")->assertStatus(503);
        $this->assertSame(0, $order->payments()->count());
    }

    public function test_cannot_pay_someone_elses_order(): void
    {
        $order = Order::factory()->create();

        $this->asUser(User::factory()->create())->postJson("/api/v1/orders/{$order->id}/payments")->assertForbidden();
    }

    public function test_webhook_rejects_a_bad_signature(): void
    {
        $this->pendingPayment();

        $this->webhook($this->completed('evt_1'), 'whsec_wrong')->assertStatus(400);
        $this->assertSame('pending', Order::first()->status->value);
    }

    public function test_webhook_marks_paid_once_and_ignores_the_duplicate(): void
    {
        $payment = $this->pendingPayment();

        $this->webhook($this->completed('evt_1'))->assertOk()->assertJsonMissingPath('duplicate');
        $this->webhook($this->completed('evt_1'))->assertOk()->assertJsonPath('duplicate', true);

        $this->assertSame('succeeded', $payment->fresh()->status->value);
        $this->assertSame('paid', $payment->order->fresh()->status->value);
        $this->assertDatabaseCount('webhook_events', 1);
    }

    public function test_webhook_amount_mismatch_does_not_mark_paid(): void
    {
        $payment = $this->pendingPayment(1990);

        $this->webhook($this->completed('evt_1', 1))->assertOk();

        $this->assertSame('pending', $payment->fresh()->status->value);
        $this->assertSame('pending', $payment->order->fresh()->status->value);
    }

    public function test_payment_for_a_cancelled_order_does_not_revive_it(): void
    {
        $payment = $this->pendingPayment();
        $payment->order->update(['status' => 'cancelled']);

        $this->webhook($this->completed('evt_1'))->assertOk();

        $this->assertSame('cancelled', $payment->order->fresh()->status->value);
    }

    public function test_expired_session_fails_the_payment_but_late_success_still_wins_over_it(): void
    {
        $payment = $this->pendingPayment();

        $this->webhook(['id' => 'evt_exp', 'object' => 'event', 'type' => 'checkout.session.expired',
            'data' => ['object' => ['id' => 'cs_test_1', 'object' => 'checkout.session']]])->assertOk();
        $this->assertSame('failed', $payment->fresh()->status->value);

        // Out of order: a completed event arriving after expired is still money received.
        $this->webhook($this->completed('evt_late'))->assertOk();
        $this->assertSame('paid', $payment->order->fresh()->status->value);
    }
}
