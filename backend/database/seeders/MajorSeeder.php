<?php

namespace Database\Seeders;

use App\Models\Major;
use Illuminate\Database\Seeder;

/**
 * The picklist of study fields for general government-scholarship
 * applications. Idempotent by name.
 */
class MajorSeeder extends Seeder
{
    private const MAJORS = [
        'Medicine (MBBS)',
        'Dentistry (BDS)',
        'Pharmacy',
        'Nursing',
        'Traditional Chinese Medicine',
        'Computer Science and Technology',
        'Software Engineering',
        'Artificial Intelligence',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Automotive Engineering',
        'Petroleum Engineering',
        'Architecture',
        'Business Administration',
        'International Business',
        'Economics',
        'Finance and Accounting',
        'International Relations',
        'Law',
        'Chinese Language and Literature',
        'International Trade',
        'Agriculture',
        'Environmental Science',
    ];

    public function run(): void
    {
        foreach (self::MAJORS as $name) {
            Major::firstOrCreate(['name' => $name], ['status' => 'active']);
        }
    }
}
