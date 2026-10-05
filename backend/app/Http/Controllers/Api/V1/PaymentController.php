<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Payments\PaymentGateway;
use App\Application\Payments\RecordPaymentResult;
use App\Application\Payments\StartPayment;
use App\Domain\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

class PaymentController extends Controller
{
    public function store(Order $order, StartPayment $startPayment): JsonResponse
    {
        $this->authorize('act', $order);

        ['payment' => $payment, 'checkout_url' => $url] = $startPayment($order);

        return response()->json(['data' => [
            'provider' => $payment->provider,
            'reference' => $payment->provider_ref,
            'checkout_url' => $url,
        ]], 201);
    }

    /** Local mode only: stands in for the provider's webhook so the flow can be demoed without Stripe keys. */
    public function simulate(Order $order, PaymentGateway $gateway, RecordPaymentResult $record): OrderResource
    {
        abort_unless($gateway->name() === 'fake' && ! app()->isProduction(), 404);
        $this->authorize('act', $order);

        $payment = $order->payments()->where('status', PaymentStatus::Pending)->latest('id')->firstOrFail();
        $record->succeeded($payment->provider_ref, $payment->amount_cents);

        return new OrderResource($order->refresh()->load('items'));
    }

    public function stripeWebhook(Request $request, RecordPaymentResult $record): JsonResponse
    {
        $secret = config('services.stripe.webhook_secret');
        abort_unless($secret, 404);

        try {
            // Verified against the raw body: re-encoded JSON would never match the signature.
            $event = Webhook::constructEvent($request->getContent(), (string) $request->header('Stripe-Signature'), $secret);
        } catch (SignatureVerificationException|UnexpectedValueException) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        // Stripe retries and may deliver the same event twice; the unique index decides who handles it.
        // Recording and handling share one transaction, so a crash mid-handling lets Stripe's retry run again.
        $duplicate = DB::transaction(function () use ($event, $record) {
            $inserted = DB::table('webhook_events')->insertOrIgnore([
                'provider' => 'stripe', 'event_id' => $event->id, 'type' => $event->type, 'created_at' => now(),
            ]);
            if ($inserted === 0) {
                return true;
            }

            $session = $event->data->object;
            match ($event->type) {
                'checkout.session.completed', 'checkout.session.async_payment_succeeded' => $session->payment_status === 'paid'
                    ? $record->succeeded($session->id, (int) $session->amount_total)
                    : null,
                'checkout.session.expired', 'checkout.session.async_payment_failed' => $record->failed($session->id),
                default => null,
            };

            return false;
        });

        if ($duplicate) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        return response()->json(['received' => true]);
    }
}
