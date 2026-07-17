<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'document_type_id' => DocumentType::factory(),
            'documentable_type' => Application::class,
            'documentable_id' => Application::factory(),
            'file_path' => 'students/'.fake()->numberBetween(1, 999).'/'.fake()->uuid().'.pdf',
            'file_name' => fake()->word().'.pdf',
            'mime' => 'application/pdf',
            'size' => fake()->numberBetween(50_000, 4_000_000),
            'status' => 'pending',
            'version' => 1,
        ];
    }

    public function verified(): static
    {
        return $this->state(fn () => ['status' => 'verified']);
    }
}
