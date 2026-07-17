<?php

use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\ApiKey;
use App\Models\Application;
use App\Models\Branch;
use App\Models\Commission;
use App\Models\Country;
use App\Models\Course;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Intake;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Offer;
use App\Models\Student;
use App\Models\University;
use App\Models\UniversityAgreement;
use App\Models\User;
use Database\Seeders\AdmissionsSeeder;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CrmSeeder;
use Database\Seeders\FinanceSeeder;
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

it('seeds the demo catalog with agreements ready for commission math', function () {
    expect(University::count())->toBeGreaterThanOrEqual(8)
        ->and(Course::count())->toBeGreaterThanOrEqual(14)
        ->and(Intake::count())->toBeGreaterThanOrEqual(16)
        ->and(UniversityAgreement::count())->toBeGreaterThanOrEqual(8);

    // The JLMU MBBS-specific fixed agreement exists alongside its
    // university-wide percent agreement (specificity matters in M5).
    $jlmu = University::where('code', 'JLMU')->firstOrFail();
    expect($jlmu->agreements()->whereNotNull('course_id')->where('commission_type', 'fixed')->exists())->toBeTrue()
        ->and($jlmu->agreements()->whereNull('course_id')->where('commission_type', 'percent')->exists())->toBeTrue();

    // Idempotency: reseeding must not duplicate rows.
    $before = UniversityAgreement::count();
    $this->seed(CatalogSeeder::class);
    expect(UniversityAgreement::count())->toBe($before);
});

it('seeds a realistic CRM pipeline', function () {
    $counselor = User::where('email', 'counselor@cas.moe')->firstOrFail();

    expect(Lead::count())->toBeGreaterThanOrEqual(25)
        ->and(Lead::where('assigned_user_id', $counselor->id)->count())->toBeGreaterThanOrEqual(10)
        ->and(Lead::where('status', 'duplicate')->whereNotNull('duplicate_of')->exists())->toBeTrue()
        ->and(Student::count())->toBeGreaterThanOrEqual(10)
        ->and(Activity::count())->toBeGreaterThanOrEqual(30)
        ->and(Agent::where('type', 'sub')->whereNotNull('parent_agent_id')->exists())->toBeTrue()
        ->and(ApiKey::count())->toBeGreaterThanOrEqual(3);

    // Reseeding must not duplicate the pipeline.
    $leadsBefore = Lead::count();
    $this->seed(CrmSeeder::class);
    expect(Lead::count())->toBe($leadsBefore);
});

it('seeds an admissions pipeline with authentic history chains', function () {
    expect(DocumentType::count())->toBeGreaterThanOrEqual(7)
        ->and(DocumentType::requiredFor('application')->count())->toBe(4)
        ->and(Application::count())->toBeGreaterThanOrEqual(12)
        ->and(Offer::count())->toBeGreaterThanOrEqual(3)
        ->and(Document::count())->toBeGreaterThanOrEqual(10);

    // The accepted application walked the full ladder through the workflow.
    $accepted = Application::where('status', 'accepted')->firstOrFail();
    expect($accepted->statusHistory()->pluck('to_status')->reverse()->values()->all())
        ->toBe(['draft', 'under_review', 'submitted', 'offer_received', 'accepted'])
        ->and($accepted->offers()->count())->toBeGreaterThanOrEqual(1)
        ->and($accepted->documents()->where('status', 'verified')->count())->toBe(4);

    // Reseeding must not duplicate the pipeline.
    $before = Application::count();
    $this->seed(AdmissionsSeeder::class);
    expect(Application::count())->toBe($before);
});

it('seeds a received commission with authentic money trail and payables', function () {
    $received = Commission::where('status', 'received')->firstOrFail();

    // Full immutable ladder.
    expect($received->statusHistory()->pluck('to_status')->reverse()->values()->all())
        ->toBe(['expected', 'pending_arrival', 'eligible', 'invoiced', 'received'])
        ->and((float) $received->received_amount)->toBeGreaterThan(0);

    // University commission invoice exists and is paid.
    $uniInvoice = Invoice::where('application_id', $received->application_id)
        ->where('party_type', 'university')->firstOrFail();
    expect($uniInvoice->status)->toBe('paid');

    // Cascade produced payables for the seeded hierarchy, within bounds.
    $payables = $received->payables;
    expect($payables->count())->toBeGreaterThanOrEqual(2)
        ->and((float) $payables->sum('amount'))->toBeLessThanOrEqual((float) $received->received_amount)
        ->and($payables->pluck('agent.agent_code'))->toContain('GSP-0001', 'LEL-0002');

    // Receivables realism: a partially paid tuition invoice exists.
    expect(Invoice::where('party_type', 'student')->where('status', 'partially_paid')->exists())->toBeTrue();

    // Reseeding must not duplicate payables.
    $before = AgentPayable::count();
    $this->seed(FinanceSeeder::class);
    expect(AgentPayable::count())->toBe($before);
});

it('seeds reference data: countries, departments, branches', function () {
    expect(Country::count())->toBeGreaterThanOrEqual(20)
        ->and(Country::where('iso2', 'CN')->exists())->toBeTrue()
        ->and(Department::count())->toBe(5)
        ->and(Branch::where('code', 'HQ')->exists())->toBeTrue()
        ->and(Branch::where('code', 'ISB')->exists())->toBeTrue();
});
