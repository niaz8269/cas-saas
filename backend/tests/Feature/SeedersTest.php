<?php

use App\Models\Branch;
use App\Models\Country;
use App\Models\Department;
use App\Models\DocumentType;
use App\Models\Intake;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Models\UniversityAgreement;
use App\Models\User;
use Database\Seeders\SasCatalogSeeder;
use Database\Seeders\VerifiedCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed();
});

it('seeds the eight staff roles on the staff guard', function () {
    expect(Role::where('guard_name', 'staff')->count())->toBe(8);

    foreach ([
        'Super Admin', 'Management', 'Admin', 'Counselor',
        'Admissions', 'Finance', 'Visa', 'Marketing',
    ] as $role) {
        expect(Role::where('name', $role)->where('guard_name', 'staff')->exists())
            ->toBeTrue("missing role: {$role}");
    }
});

it('seeds a demo account per role with the Super Admin bypass working', function () {
    $admin = User::where('email', 'admin@cas.moe')->firstOrFail();

    expect($admin->hasRole('Super Admin'))->toBeTrue();

    // Gate::before bypass: an ability nobody was explicitly granted.
    expect(Gate::forUser($admin)->allows('anything.at.all'))->toBeTrue();
});

it('enforces the matrix for counselors (deny-by-default)', function () {
    $counselor = User::where('email', 'counselor@cas.moe')->firstOrFail();

    expect($counselor->hasRole('Counselor'))->toBeTrue()
        ->and($counselor->hasPermissionTo('leads.view.assigned'))->toBeTrue()
        ->and($counselor->hasPermissionTo('commission.view.own'))->toBeTrue()
        ->and($counselor->hasPermissionTo('users.manage.global'))->toBeFalse()
        ->and($counselor->hasPermissionTo('finance.manage.global'))->toBeFalse()
        ->and(Gate::forUser($counselor)->allows('users.manage.global'))->toBeFalse();
});

it('gives finance commission control but no lead management', function () {
    $finance = User::where('email', 'finance@cas.moe')->firstOrFail();

    expect($finance->hasPermissionTo('commission.manage.global'))->toBeTrue()
        ->and($finance->hasPermissionTo('finance.manage.global'))->toBeTrue()
        ->and($finance->hasPermissionTo('leads.view.global'))->toBeFalse();
});

it('seeds only verified catalog data, each record carrying its official source', function () {
    expect(University::count())->toBeGreaterThanOrEqual(300)
        ->and(Program::count())->toBeGreaterThan(50000)
        ->and(University::whereNotNull('name_zh')->count())->toBeGreaterThan(290)
        ->and(Program::where('csc_listed', true)->count())->toBeGreaterThan(0)
        ->and(Intake::count())->toBeGreaterThan(0)
        ->and(Scholarship::count())->toBeGreaterThan(0)
        ->and(Scholarship::where('scope', 'government')->whereNull('university_id')->count())->toBe(7);

    // No placeholder content: every published fact names its source page and
    // the day it was checked, and the MoE flag mirrors the official list.
    expect(Program::whereNull('source_url')->orWhereNull('verified_on')->count())->toBe(0)
        ->and(Intake::whereNull('source_url')->orWhereNull('verified_on')->count())->toBe(0)
        ->and(Scholarship::whereNull('source_url')->orWhereNull('verified_on')->count())->toBe(0)
        // "MoE-listed" is exactly the Ministry's approved English-taught MBBS list (43 for 2026-27), with its source.
        ->and(University::where('moe_listed', true)->count())->toBe(43)
        ->and(University::where('moe_listed', true)->whereNull('moe_mbbs_source_url')->count())->toBe(0)
        ->and(University::where('moe_listed', false)->whereNotNull('moe_mbbs_year')->count())->toBe(0)
        ->and(UniversityAgreement::count())->toBe(0);

    // The open date never falls after the close date.
    expect(Intake::whereColumn('application_open_date', '>', 'application_deadline')->count())->toBe(0)
        ->and(Scholarship::whereColumn('application_open_date', '>', 'deadline')->count())->toBe(0);

    // Idempotency: reseeding replaces rather than duplicates.
    $programs = Program::count();
    $universities = University::count();
    $this->seed(VerifiedCatalogSeeder::class);
    $this->seed(SasCatalogSeeder::class);
    expect(Program::count())->toBe($programs)
        ->and(University::count())->toBe($universities);
});

it('seeds the application document checklist', function () {
    expect(DocumentType::count())->toBe(9)
        ->and(DocumentType::requiredFor('application')->count())->toBe(4);
});

it('seeds reference data: countries, departments, branches', function () {
    expect(Country::count())->toBeGreaterThanOrEqual(20)
        ->and(Country::where('iso2', 'CN')->exists())->toBeTrue()
        ->and(Department::count())->toBe(5)
        ->and(Branch::where('code', 'HQ')->exists())->toBeTrue()
        ->and(Branch::where('code', 'ISB')->exists())->toBeTrue();
});
