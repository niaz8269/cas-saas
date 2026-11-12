<?php

use App\Mail\NewEnquiryMail;
use App\Models\ApiSource;
use App\Models\Country;
use App\Models\Lead;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('creates a source-attributed lead from a public enquiry', function () {
    Country::factory()->create(['iso2' => 'PK']);
    $uni = University::factory()->create();
    $program = Program::factory()->for($uni)->create();

    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Ali',
        'last_name' => 'Khan',
        'email' => 'ali@example.com',
        'country' => 'PK',
        'message' => 'Interested in MBBS.',
        'interested_university_id' => $uni->id,
        'interested_program_id' => $program->id,
        'source_url' => 'https://www.cas.moe/programs/mbbs',
    ])
        ->assertStatus(202)
        ->assertJsonPath('message', 'Thank you — a CAS advisor will be in touch shortly.')
        // the public response never leaks internal ids/status
        ->assertJsonMissingPath('lead_id')
        ->assertJsonMissingPath('code');

    $lead = Lead::first();
    expect($lead)->not->toBeNull()
        ->and($lead->status)->toBe('new')
        ->and($lead->email)->toBe('ali@example.com')
        ->and($lead->message)->toBe('Interested in MBBS.')
        ->and($lead->meta['enquiry']['university_id'])->toBe($uni->id)
        ->and($lead->meta['enquiry']['program_id'])->toBe($program->id);
});

it('tags a study-plan submission and stores the answers in lead meta', function () {
    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Sara',
        'email' => 'sara@example.com',
        'message' => 'Study plan request',
        'form_type' => 'study_plan',
        'details' => ['Level' => "Master's", 'Field' => 'Engineering', 'Funding' => 'Looking for a scholarship'],
    ])->assertStatus(202);

    $lead = Lead::first();
    expect($lead->form_type)->toBe('study_plan')
        ->and($lead->meta['plan']['Level'])->toBe("Master's")
        ->and($lead->meta['plan']['Field'])->toBe('Engineering')
        ->and($lead->meta['plan']['Funding'])->toBe('Looking for a scholarship');
});

it('rejects an unknown form_type', function () {
    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'X', 'email' => 'x@example.com', 'form_type' => 'spam',
    ])->assertStatus(422)->assertJsonValidationErrors('form_type');
});

it('requires a name and at least an email or phone', function () {
    $this->postJson('/api/v1/public/enquiries', ['message' => 'hi'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['first_name', 'email', 'phone']);
});

it('silently drops a honeypot submission without creating a lead', function () {
    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Bot', 'email' => 'bot@example.com', 'company' => 'Spam Co',
    ])->assertStatus(202);

    expect(Lead::count())->toBe(0);
});

it('does not reveal that an email already belongs to a student', function () {
    Student::factory()->create(['email' => 'existing@example.com']);

    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Existing', 'email' => 'existing@example.com',
    ])
        ->assertStatus(202) // same generic acknowledgement, not 409
        ->assertExactJson(['message' => 'Thank you — a CAS advisor will be in touch shortly.']);

    // Internally the duplicate is still recorded for the audit trail.
    expect(Lead::where('status', 'duplicate')->exists())->toBeTrue();
});

it('reuses one CAS Website source across enquiries', function () {
    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'A', 'email' => 'a@example.com'])->assertStatus(202);
    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'B', 'phone' => '+92 300 111'])->assertStatus(202);

    expect(ApiSource::where('name', 'CAS Website')->count())->toBe(1);
});

it('accepts the nationality of any real country, even one not yet in the CRM country table', function () {
    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Marie', 'email' => 'marie@example.com', 'country' => 'FR',
        'message' => 'Quick enquiry from the home page.',
    ])->assertStatus(202);

    expect(Lead::where('email', 'marie@example.com')->exists())->toBeTrue();

    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'X', 'email' => 'x@example.com', 'country' => 'ZZ'])->assertStatus(422);
});

it('emails the pop-up enquiry to the CAS inbox with the visitor on Reply-To, and still saves the lead', function () {
    Mail::fake();

    $this->postJson('/api/v1/public/enquiries', [
        'first_name' => 'Ali', 'last_name' => 'Raza', 'email' => 'ali@example.com', 'phone' => '+92 300 1234567', 'country' => 'PK',
        'form_type' => 'home_popup', 'source_url' => 'https://cas.moe/',
        'details' => ['degree' => 'Master', 'program' => 'Engineering', 'nationality' => 'Pakistan'],
    ])->assertStatus(202);

    Mail::assertSent(NewEnquiryMail::class, function ($mail) {
        return $mail->hasTo('enquiry@cas.moe')
            && $mail->hasReplyTo('ali@example.com')
            && str_contains($mail->envelope()->subject, 'Ali Raza (Master / Engineering)')
            && str_contains($mail->render(), 'Pakistan');
    });
    expect(Lead::where('email', 'ali@example.com')->exists())->toBeTrue();
});

it('does not email ordinary enquiries or honeypot spam, and a mail failure never loses the lead', function () {
    Mail::fake();

    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'Plain', 'email' => 'plain@example.com'])->assertStatus(202);
    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'Bot', 'email' => 'bot@example.com', 'form_type' => 'home_popup', 'company' => 'Acme'])->assertStatus(202);
    Mail::assertNothingSent();

    Mail::shouldReceive('to')->andThrow(new RuntimeException('smtp down'));
    $this->postJson('/api/v1/public/enquiries', ['first_name' => 'Ok', 'email' => 'ok@example.com', 'form_type' => 'home_popup'])->assertStatus(202);
    expect(Lead::where('email', 'ok@example.com')->exists())->toBeTrue();
});
