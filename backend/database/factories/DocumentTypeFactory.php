<?php

namespace Database\Factories;

use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentType>
 */
class DocumentTypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'category' => fake()->randomElement(['identity', 'academic', 'financial', 'medical']),
            'is_sensitive' => false,
            'required_for' => null,
        ];
    }

    public function requiredForApplication(): static
    {
        return $this->state(fn () => ['required_for' => ['application']]);
    }

    public function sensitive(): static
    {
        return $this->state(fn () => ['is_sensitive' => true]);
    }
}
