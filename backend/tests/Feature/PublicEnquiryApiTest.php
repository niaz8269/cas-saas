<?php

use App\Models\ApiSource;
use App\Models\Country;
use App\Models\Lead;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
