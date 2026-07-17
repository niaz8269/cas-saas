<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'payment_no' => strtoupper(fake()->unique()->bothify('PAY-2026-#####')),
            'invoice_id' => Invoice::factory(),
            'amount' => fake()->numberBetween(1000, 20000),
            'currency' => 'CNY',
            'method' => fake()->randomElement(['bank_transfer', 'wechat', 'alipay', 'cash']),
            'reference' => strtoupper(fake()->bothify('TXN-########')),
            'received_at' => now(),
        ];
    }
}
