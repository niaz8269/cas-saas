<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Departments per schema.sql note: Counseling/Admissions/Finance/Visa/Marketing.
     */
    private const DEPARTMENTS = [
        ['Counseling', 'CNS'],
        ['Admissions', 'ADM'],
        ['Finance', 'FIN'],
        ['Visa', 'VIS'],
        ['Marketing', 'MKT'],
    ];

    public function run(): void
    {
        foreach (self::DEPARTMENTS as [$name, $code]) {
            Department::updateOrCreate(['code' => $code], ['name' => $name, 'is_active' => true]);
        }
    }
}
