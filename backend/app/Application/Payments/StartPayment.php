<?php

namespace App\Application\Payments;

use App\Domain\Enums\OrderStatus;
use App\Domain\Enums\PaymentStatus;
use App\Domain\Exceptions\BusinessRuleViolation;
use App\Models\Order;
use App\Models\Payment;

final class StartPayment
{
    public function __construct(private PaymentGateway $gateway) {}

    /** @return array{payment: Payment, checkout_url: ?string} */
    public function __invoke(Order $order): array
    {
        if ($order->status !== OrderStatus::Pending) {
            throw new BusinessRuleViolation('order_not_payable', "A {$order->status->value} order cannot be paid.");
        }

        $checkout = $this->gateway->createCheckout($order->loadMissing('items'));

        $payment = $order->payments()->create([
            'provider' => $this->gateway->name(),
            'provider_ref' => $checkout['ref'],
            'status' => PaymentStatus::Pending,
            'amount_cents' => $order->total_cents,
        ]);

        return ['payment' => $payment, 'checkout_url' => $checkout['checkout_url']];
    }
}
