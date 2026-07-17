<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\VisaCase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisaCase>
 */
class VisaCaseFactory extends Factory
{
    public function definition(): array
    {
        $application = Application::factory();

        return [
            'application_id' => $application,
            'student_id' => fn (array $attributes) => Application::find($attributes['application_id'])->student_id,
            'status' => 'not_started',
        ];
    }
}
