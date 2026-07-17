<?php

use App\Models\Agent;
use App\Models\AgentAgreement;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Course;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\University;
use App\Models\UniversityAgreement;
use App\Models\User;
use App\Services\Finance\AgreementResolver;
use App\Services\Finance\CommissionEngine;
use App\Services\Finance\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

uses(RefreshDatabase::class);

function financeActor(): User
{
    return User::factory()->create();
}

/**
 * JLMU-style fixture: course-specific fixed agreement + university-wide percent.
 */
function jlmuFixture(): array
{
    $university = University::factory()->create(['name' => 'Jilin Medical University']);
    $mbbs = Course::factory()->for($university)->create([
        'name' => 'MBBS', 'tuition_fee' => 30000, 'currency' => 'CNY',
    ]);
    $nursing = Course::factory()->for($university)->create([
        'name' => 'Nursing', 'tuition_fee' => 20000, 'currency' => 'CNY',
    ]);

    $fixed = UniversityAgreement::factory()->for($university)->create([
        'course_id' => $mbbs->id, 'commission_type' => 'fixed',
        'commission_value' => 8000, 'currency' => 'CNY',
        'valid_from' => now()->subYear(), 'valid_to' => now()->addYear(),
    ]);
    $percent = UniversityAgreement::factory()->for($university)->create([
        'course_id' => null, 'commission_type' => 'percent',
        'commission_value' => 12, 'currency' => null,
        'valid_from' => now()->subYear(), 'valid_to' => now()->addYear(),
    ]);

    return compact('university', 'mbbs', 'nursing', 'fixed', 'percent');
}

it('resolves course-specific agreements over university-wide ones', function () {
    $fx = jlmuFixture();
    $resolver = app(AgreementResolver::class);

    $mbbsApp = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])->create();
    $nursingApp = Application::factory()->forCatalog($fx['university'], $fx['nursing'])->create();

    expect($resolver->resolve($mbbsApp)->id)->toBe($fx['fixed']->id)
        ->and($resolver->resolve($nursingApp)->id)->toBe($fx['percent']->id);
});

it('ignores agreements outside their validity window', function () {
    $fx = jlmuFixture();
    $fx['fixed']->update(['valid_to' => now()->subMonth()]); // expired

    $mbbsApp = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])->create();

    expect(app(AgreementResolver::class)->resolve($mbbsApp)->id)->toBe($fx['percent']->id);
});

it('creates tuition invoice and expected commission on acceptance', function () {
    $fx = jlmuFixture();
    $actor = financeActor();
    $application = Application::factory()->forCatalog($fx['university'], $fx['nursing'])->create();

    app(CommissionEngine::class)->onApplicationAccepted($application, $actor);

    $invoice = Invoice::where('application_id', $application->id)->where('party_type', 'student')->first();
    $commission = Commission::where('application_id', $application->id)->first();

    expect($invoice)->not->toBeNull()
        ->and($invoice->total)->toBe('20000.00')
        ->and($invoice->items()->count())->toBe(1)
        // percent: 12% of 20000 = 2400
        ->and($commission->expected_amount)->toBe('2400.00')
        ->and($commission->currency)->toBe('CNY')
        ->and($commission->agreement_id)->toBe($fx['percent']->id)
        ->and($commission->statusHistory()->count())->toBe(1);
});

it('uses the fixed amount for course-specific agreements', function () {
    $fx = jlmuFixture();
    $application = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])->create();

    $commission = app(CommissionEngine::class)->openExpected($application, financeActor());

    expect($commission->expected_amount)->toBe('8000.00')
        ->and($commission->agreement_id)->toBe($fx['fixed']->id);
});

it('opens a zero commission with a note when no agreement exists', function () {
    $application = Application::factory()->create();

    $commission = app(CommissionEngine::class)->openExpected($application, financeActor());

    expect($commission->expected_amount)->toBe('0.00')
        ->and($commission->agreement_id)->toBeNull()
        ->and($commission->statusHistory()->first()->reference)->toContain('No valid agreement');
});

it('is idempotent per application', function () {
    $fx = jlmuFixture();
    $application = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])->create();
    $engine = app(CommissionEngine::class);

    $first = $engine->openExpected($application, financeActor());
    $second = $engine->openExpected($application, financeActor());

    expect($second->id)->toBe($first->id)
        ->and(Commission::count())->toBe(1);
});

it('rejects illegal lifecycle jumps', function () {
    $commission = Commission::factory()->create(); // expected

    expect(fn () => app(CommissionEngine::class)->transition($commission, 'invoiced', financeActor()))
        ->toThrow(ConflictHttpException::class);
});

it('gates eligibility on arrival and paid first-year tuition', function () {
    $fx = jlmuFixture();
    $actor = financeActor();
    $engine = app(CommissionEngine::class);

    $student = Student::factory()->create(['status' => 'enrolled']);
    $application = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])
        ->create(['student_id' => $student->id]);

    $engine->onApplicationAccepted($application, $actor);
    $commission = Commission::where('application_id', $application->id)->first();
    $engine->transition($commission, 'pending_arrival', $actor);

    // Not arrived yet → blocked.
    expect(fn () => $engine->transition($commission->refresh(), 'eligible', $actor))
        ->toThrow(ConflictHttpException::class);

    $student->update(['status' => 'arrived']);

    // Arrived but tuition unpaid → still blocked.
    expect(fn () => $engine->transition($commission->refresh(), 'eligible', $actor))
        ->toThrow(ConflictHttpException::class);

    $tuition = Invoice::where('application_id', $application->id)->where('party_type', 'student')->first();
    app(InvoiceService::class)->recordPayment($tuition, (float) $tuition->total, $actor);

    $engine->transition($commission->refresh(), 'eligible', $actor);

    expect($commission->refresh()->status)->toBe('eligible')
        ->and($commission->eligible_amount)->toBe('8000.00')
        ->and($commission->eligibility_confirmed_at)->not->toBeNull();
});

it('walks the full lifecycle and cascades agent shares', function () {
    $fx = jlmuFixture();
    $actor = financeActor();
    $engine = app(CommissionEngine::class);

    // Partner (50%) → sub-agent (20%); the record belongs to the sub-agent.
    $partner = Agent::factory()->create();
    AgentAgreement::factory()->for($partner)->create(['share_type' => 'percent', 'share_value' => 50]);
    $sub = Agent::factory()->subAgentOf($partner)->create();
    AgentAgreement::factory()->for($sub)->create(['share_type' => 'percent', 'share_value' => 20]);

    $student = Student::factory()->create(['status' => 'arrived', 'agent_id' => $sub->id]);
    $application = Application::factory()->forCatalog($fx['university'], $fx['mbbs'])
        ->create(['student_id' => $student->id, 'agent_id' => $sub->id]);

    $engine->onApplicationAccepted($application, $actor);
    $commission = Commission::where('application_id', $application->id)->first();

    $tuition = Invoice::where('application_id', $application->id)->where('party_type', 'student')->first();
    app(InvoiceService::class)->recordPayment($tuition, (float) $tuition->total, $actor);

    $engine->transition($commission, 'pending_arrival', $actor);
    $engine->transition($commission->refresh(), 'eligible', $actor);
    $engine->transition($commission->refresh(), 'invoiced', $actor);

    // University invoice exists for the eligible amount.
    $uniInvoice = Invoice::where('application_id', $application->id)->where('party_type', 'university')->first();
    expect($uniInvoice)->not->toBeNull()->and($uniInvoice->total)->toBe('8000.00');

    $engine->transition($commission->refresh(), 'received', $actor, ['reference' => 'BANK-REF-77']);

    $commission->refresh();
    expect($commission->status)->toBe('received')
        ->and($commission->received_amount)->toBe('8000.00')
        ->and($uniInvoice->refresh()->status)->toBe('paid');

    // Cascade: partner gross 4000, sub gross 1600 → partner net 2400.
    $partnerPayable = AgentPayable::where('agent_id', $partner->id)->first();
    $subPayable = AgentPayable::where('agent_id', $sub->id)->first();
    expect($partnerPayable->amount)->toBe('2400.00')
        ->and($subPayable->amount)->toBe('1600.00');

    // Immutable trail covers the whole ladder.
    expect($commission->statusHistory()->pluck('to_status')->reverse()->values()->all())
        ->toBe(['expected', 'pending_arrival', 'eligible', 'invoiced', 'received']);
});

it('marks invoices partially paid then paid as receipts accumulate', function () {
    $actor = financeActor();
    $invoice = Invoice::factory()->create(['total' => 10000, 'status' => 'issued']);
    $service = app(InvoiceService::class);

    $service->recordPayment($invoice, 4000, $actor);
    expect($invoice->refresh()->status)->toBe('partially_paid');

    $service->recordPayment($invoice, 6000, $actor);
    expect($invoice->refresh()->status)->toBe('paid')
        ->and($invoice->amount_paid)->toBe('10000.00')
        ->and($invoice->payments()->count())->toBe(2);
});
