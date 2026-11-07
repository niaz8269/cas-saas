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
use Database\Seeders\MbbsProgramGapSeeder;
use Database\Seeders\MirrorPhotosSeeder;
use Database\Seeders\MoeMbbsSeeder;
use Database\Seeders\OfficialIntakeDatesSeeder;
use Database\Seeders\RegisteredMajorsSeeder;
use Database\Seeders\SasCatalogSeeder;
use Database\Seeders\VerifiedCatalogSeeder;
use Database\Seeders\WikipediaProfileSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed();
});

it('seeds the five staff roles on the staff guard', function () {
    expect(Role::where('guard_name', 'staff')->count())->toBe(5);

    foreach ([
        'Super Admin', 'Admin', 'Counselor', 'Finance', 'Visa',
    ] as $role) {
        expect(Role::where('name', $role)->where('guard_name', 'staff')->exists())
            ->toBeTrue("missing role: {$role}");
    }
});

it('folds the retired roles into Admin and moves their users across', function () {
    foreach (['Management', 'Admissions', 'Marketing'] as $name) {
        $user = User::factory()->create();
        $user->assignRole(Role::findOrCreate($name, 'staff'));

        (new \Database\Seeders\RolesAndPermissionsSeeder)->run();

        expect(Role::where('name', $name)->exists())->toBeFalse()
            ->and($user->fresh()->hasRole('Admin'))->toBeTrue();
    }

    expect(Role::where('guard_name', 'staff')->count())->toBe(5);
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

it('seeds the catalog', function () {
    expect(University::count())->toBeGreaterThanOrEqual(300)
        ->and(Program::count())->toBeGreaterThan(50000)
        ->and(University::whereNotNull('name_zh')->count())->toBeGreaterThan(290)
        ->and(Program::where('csc_listed', true)->count())->toBeGreaterThan(0)
        ->and(Intake::count())->toBeGreaterThan(0)
        ->and(Scholarship::count())->toBeGreaterThan(0)
        ->and(Scholarship::where('scope', 'government')->whereNull('university_id')->count())->toBe(7);

    // "MoE-listed" is exactly the Ministry's approved English-taught MBBS list (43 for 2026-27).
    expect(University::where('moe_listed', true)->count())->toBe(43)
        ->and(University::where('moe_listed', false)->whereNotNull('moe_mbbs_year')->count())->toBe(0)
        ->and(UniversityAgreement::count())->toBe(0);

    // The open date never falls after the close date.
    expect(Intake::whereColumn('application_open_date', '>', 'application_deadline')->count())->toBe(0)
        ->and(Scholarship::whereColumn('application_open_date', '>', 'deadline')->count())->toBe(0);

    // The MoE-approved MBBS universities carry published application windows where an official page states them.
    expect(Intake::whereHas('university', fn ($q) => $q->where('moe_listed', true))->whereNotNull('application_deadline')->count())->toBeGreaterThanOrEqual(15);

    // Universities from the Ministry's national list (ten-digit school code) and the ones added from their own admissions
    // pages have a name, place and basic profile but no photo or overview research yet; the completeness checks below
    // cover the researched catalog only.
    $added = collect(json_decode(file_get_contents(database_path('data/additional_universities.json')), true)['universities'])->pluck('name');
    $researched = University::all()->reject(fn ($u) => ctype_digit((string) $u->code) || $added->contains($u->name))->pluck('id');

    // Wikipedia profile: facts and an introduction for nearly every university, a campus or city photo for almost all
    expect(University::whereNotNull('founded_year')->count())->toBeGreaterThan(250)
        ->and(University::whereNotNull('wikipedia_url')->count())->toBeGreaterThan(280)
        ->and(University::whereIn('id', $researched)->where(fn ($q) => $q->whereNull('cover_path')->orWhere('cover_path', ''))->count())->toBeLessThan(10)
        ->and(University::where('cover_is_city', true)->whereNull('cover_credit')->count())->toBe(0);

    // Photos are served by the site itself, not hotlinked from Wikimedia.
    expect(University::where('cover_path', 'like', 'http%')->orWhere('logo_path', 'like', 'http%')->count())->toBe(0);

    // Public-page gaps: every university has a nearest airport and an introduction; most have a seal.
    expect(University::whereIn('id', $researched)->whereNull('nearest_airport')->count())->toBe(0)
        ->and(University::where(fn ($q) => $q->whereNull('about')->orWhere('about', ''))->count())->toBe(0)
        ->and(University::whereNotNull('emblem_path')->count())->toBeGreaterThan(140);

    // Long overview text for every university, and (almost) no cover photo shared by several universities.
    expect(University::whereIn('id', $researched)->whereNull('overview')->count())->toBe(0)
        ->and(University::where('cover_is_city', false)->distinct()->count('cover_path'))->toBeGreaterThan(215);

    // Idempotency: reseeding replaces rather than duplicates.
    $programs = Program::count();
    $universities = University::count();
    $this->seed(VerifiedCatalogSeeder::class);
    $this->seed(SasCatalogSeeder::class);
    $this->seed(OfficialIntakeDatesSeeder::class);
    $this->seed(WikipediaProfileSeeder::class);
    $this->seed(MirrorPhotosSeeder::class);
    $this->seed(MoeMbbsSeeder::class);
    $this->seed(MbbsProgramGapSeeder::class);
    $this->seed(RegisteredMajorsSeeder::class);
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
