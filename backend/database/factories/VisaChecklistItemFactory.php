<?php

namespace Database\Factories;

use App\Models\VisaCase;
use App\Models\VisaChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisaChecklistItem>
 */
class VisaChecklistItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'visa_case_id' => VisaCase::factory(),
            'name' => fake()->randomElement([
                'Passport (6+ months validity)', 'JW202 Form', 'Admission Letter',
                'Physical Examination Record', 'Bank Statement', 'Police Clearance',
            ]),
            'is_required' => true,
            'status' => 'pending',
        ];
    }
}
