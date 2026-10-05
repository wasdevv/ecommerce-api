<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPlaced extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $total = number_format($this->order->total_cents / 100, 2);

        return (new MailMessage)
            ->subject("Order {$this->order->number} received")
            ->line("We received your order {$this->order->number}.")
            ->line('Total: '.strtoupper(config('shop.currency'))." {$total}")
            ->action('View order', rtrim(config('shop.frontend_url'), '/')."/orders/{$this->order->id}");
    }
}
