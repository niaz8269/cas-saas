<?php

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Country>
 */
class CountryFactory extends Factory
{
    /** Process-wide counter driving collision-free synthetic ISO codes. */
    private static int $sequence = 0;

    public function definition(): array
    {
        $n = self::$sequence++;

        return [
            'name' => fake()->country().' '.$n,
            // Always digit-first, so a factory country can never collide with a
            // real 2-letter code a test sets explicitly (e.g. 'PK', 'CN'). Unique
            // within any test (a single transaction never creates ~360 countries),
            // and counter-based so it can't exhaust a bounded faker pool.
            'iso2' => sprintf('%d%s', $n % 10, strtoupper(base_convert(intdiv($n, 10) % 36, 10, 36))),
            'phone_code' => '+'.fake()->numberBetween(1, 998),
        ];
    }
}
