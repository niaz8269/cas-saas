<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        $total = fake()->numberBetween(2000, 40000);

        return [
            'invoice_no' => strtoupper(fake()->unique()->bothify('INV-2026-#####')),
            'party_type' => 'student',
            'party_id' => Student::factory(),
            'currency' => 'CNY',
            'subtotal' => $total,
            'tax' => 0,
            'total' => $total,
            'amount_paid' => 0,
            'status' => 'issued',
            'issued_at' => now(),
            'due_at' => now()->addDays(30),
        ];
    }
}
