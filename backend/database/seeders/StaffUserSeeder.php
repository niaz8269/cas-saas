<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * One demo account per staff role so every screen can be demoed.
 * Password comes from DEMO_PASSWORD (never hard-code real credentials).
 */
class StaffUserSeeder extends Seeder
{
    /**
     * email => [name, role, department code|null]
     *
     * @var array<string, array{0: string, 1: string, 2: ?string}>
     */
    private const STAFF = [
        'admin@cas.moe' => ['CAS Super Admin', 'Super Admin', null],
        'management@cas.moe' => ['CAS Management', 'Management', null],
        'operations@cas.moe' => ['CAS Operations', 'Admin', null],
        'counselor@cas.moe' => ['Demo Counselor', 'Counselor', 'CNS'],
        'admissions@cas.moe' => ['Demo Admissions Officer', 'Admissions', 'ADM'],
        'finance@cas.moe' => ['Demo Finance Officer', 'Finance', 'FIN'],
        'visa@cas.moe' => ['Demo Visa Officer', 'Visa', 'VIS'],
        'marketing@cas.moe' => ['Demo Marketer', 'Marketing', 'MKT'],
    ];

    public function run(): void
    {
        $password = env('DEMO_PASSWORD', 'CasDemo#2026');
        $hq = Branch::where('code', 'HQ')->first();
        $departments = Department::pluck('id', 'code');

        foreach (self::STAFF as $email => [$name, $role, $departmentCode]) {
            $user = User::updateOrCreate(['email' => $email], [
                'name' => $name,
                'password' => $password,
                'branch_id' => $hq?->id,
                'department_id' => $departmentCode ? $departments[$departmentCode] ?? null : null,
                'status' => 'active',
            ]);

            $user->syncRoles([$role]);
        }
    }
}
