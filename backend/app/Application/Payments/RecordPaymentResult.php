<?php

namespace App\Application\Payments;

use App\Domain\Enums\OrderStatus;
use App\Domain\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Applies a provider's verdict to a payment and its order. Idempotent: a payment that
 * already reached a final state is left alone, so duplicate or late events are harmless.
 */
final class RecordPaymentResult
{
    public function succeeded(string $providerRef, int $amountCents): void
    {
        DB::transaction(function () use ($providerRef, $amountCents) {
            $payment = Payment::query()->where('provider_ref', $providerRef)->lockForUpdate()->first();
            if (! $payment || $payment->status === PaymentStatus::Succeeded) {
                return;
            }

            if ($amountCents !== $payment->amount_cents) {
                Log::error('payment.amount_mismatch', ['payment' => $payment->id, 'expected' => $payment->amount_cents, 'got' => $amountCents]);

                return;
            }

            $payment->update(['status' => PaymentStatus::Succeeded]);

            $order = Order::query()->lockForUpdate()->findOrFail($payment->order_id);
            if ($order->status === OrderStatus::Pending) {
                $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()]);
            } else {
                // ponytail: money arrived for a cancelled order; logged for a manual refund, automate via the gateway when volume asks for it
                Log::warning('payment.succeeded_for_non_pending_order', ['order' => $order->id, 'status' => $order->status->value]);
            }
        });
    }

    public function failed(string $providerRef): void
    {
        Payment::query()
            ->where('provider_ref', $providerRef)
            ->where('status', PaymentStatus::Pending)
            ->update(['status' => PaymentStatus::Failed]);
    }
}
