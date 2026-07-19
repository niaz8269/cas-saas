<?php

use App\Models\ApiKey;
use App\Models\ApiSource;
use App\Models\Application;
use App\Models\Country;
use App\Models\Notification;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

/**
 * A source keyed to a university + default program, mirroring the Xinjiang
 * Medical MBBS partner site.
 *
 * @return array{source: ApiSource, program: Program, key: string}
 */
function mbbsSourceWithKey(): array
{
    $uni = University::factory()->create(['name' => 'Xinjiang Medical University', 'status' => 'active']);
    $program = Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active',
    ]);
    $source = ApiSource::factory()->create([
        'name' => 'XJMU Admissions Site',
        'type' => 'website',
        'university_id' => $uni->id,
        'default_program_id' => $program->id,
    ]);
    $plainKey = 'cas_'.Str::random(40);
    $source->apiKeys()->create(['key_hash' => ApiKey::hashKey($plainKey), 'rate_limit' => 120]);

    return ['source' => $source, 'program' => $program, 'key' => $plainKey];
}

function postApplication(array $payload, string $key, array $headers = [])
{
    return test()->postJson('/api/v1/ingest/applications', $payload, ['X-Api-Key' => $key, ...$headers]);
}

/** The XJMU review-page shape (partner field labels). */
function xjmuPayload(): array
{
    return [
        'degree' => "Bachelor's Degree",
        'major' => 'Mbbs',
        'student' => [
            'given_name' => 'Ayesha',
            'surname' => 'Shakeel',
            'chinese_name' => '黄佳佳',
            'dob' => '2005-06-25',
            'gender' => 'Female',
            'marital_status' => 'Single',
            'country_of_birth' => 'Pakistan',
            'city_of_birth' => 'Gujranwala',
            'religion' => 'Islam',
            'nationality' => 'Pakistan',
            'native_language' => 'Urdu',
            'passport_no' => 'UD5164361',
            'passport_expiry' => '2035-11-12',
            'present_address' => 'Khyali shahpur muhalla sardar colony st 11',
            'permanent_address' => 'Khyali shahpur muhalla sardar colony st 11',
            'tel' => '03004775417',
            'email' => 'ayeshashakeel4248@gmail.com',
            'alternate_email' => 'ayeshashakeelahmad11@gmail.com',
            'wechat_id' => 'wxid_x8hofj6fjr5t22',
        ],
        'emergency_contact' => [
            'name' => 'Arfa',
            'gender' => 'Female',
            'relationship' => 'Parent',
            'tel' => '03338234478',
            'email' => 'arfiarfa@gmail.com',
            'address' => 'Khyali shahpur muhalla sardar colony st 11',
        ],
        'education' => [
            ['level' => 'Senior High School', 'field' => 'Pre medical',
                'institution' => 'Punjab group of colleges', 'start_date' => '2022-01-13', 'end_date' => '2025-06-13'],
            ['level' => 'Junior High School', 'field' => 'Science',
                'institution' => 'The Royal school of science', 'start_date' => '2020-06-13', 'end_date' => '2021-10-13'],
        ],
        'documents' => [
            ['type' => 'Passport', 'file_name' => 'IMG_8363 Small.jpeg', 'mime' => 'image/jpeg',
                'content' => base64_encode('passport-bytes')],
            ['type' => 'Educational document', 'file_name' => 'Fsc CERTIFICATE.pdf', 'mime' => 'application/pdf',
                'content' => base64_encode('fsc-bytes')],
        ],
    ];
}

it('ingests a full XJMU application straight into Applications for verification', function () {
    Storage::fake('s3');
    Role::findOrCreate('Admissions', 'staff');
    $officer = User::factory()->create();
    $officer->assignRole('Admissions');
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);

    ['source' => $source, 'program' => $program, 'key' => $key] = mbbsSourceWithKey();

    $response = postApplication(xjmuPayload(), $key);

    $response->assertCreated()
        ->assertJsonPath('status', 'under_review')
        ->assertJsonStructure(['application_id', 'application_code', 'student_code', 'status']);

    $application = Application::findOrFail($response->json('application_id'));
    expect($application->kind)->toBe('program')
        ->and($application->review)->toBeTrue()
        ->and($application->source_id)->toBe($source->id)
        ->and($application->program_id)->toBe($program->id)
        ->and($application->university_id)->toBe($program->university_id)
        ->and($application->assigned_admissions_id)->toBe($officer->id)
        ->and($application->status)->toBe('under_review');

    // The applicant is captured with every profile field mapped.
    $student = $application->student;
    expect($student->first_name)->toBe('Ayesha')
        ->and($student->last_name)->toBe('Shakeel')
        ->and($student->chinese_name)->toBe('黄佳佳')
        ->and($student->native_language)->toBe('Urdu')
        ->and($student->alternate_email)->toBe('ayeshashakeelahmad11@gmail.com')
        ->and($student->wechat_id)->toBe('wxid_x8hofj6fjr5t22')
        ->and($student->passport_no)->toBe('UD5164361')
        ->and($student->passport_expiry_date->format('Y-m-d'))->toBe('2035-11-12')
        ->and($student->place_of_birth)->toBe('Gujranwala, Pakistan')
        ->and($student->current_address)->toBe('Khyali shahpur muhalla sardar colony st 11')
        ->and($student->country?->name)->toBe('Pakistan');

    // Emergency contact is recorded as a guardian; both education rows persist.
    expect($student->guardians()->where('relation', 'Parent')->where('name', 'Arfa')->exists())->toBeTrue()
        ->and($student->education()->count())->toBe(2)
        ->and($student->education()->where('start_year', 2022)->where('end_year', 2025)->exists())->toBeTrue();

    // Documents are stored on S3 and registered against the application.
    expect($application->documents()->count())->toBe(2);
    $application->documents->each(fn ($doc) => expect(Storage::disk('s3')->exists($doc->file_path))->toBeTrue());

    // The assigned officer is notified to verify.
    expect(Notification::where('user_id', $officer->id)
        ->where('entity_type', 'application')
        ->where('entity_id', $application->id)
        ->exists())->toBeTrue();
});

it('falls back to the source default program when none is supplied', function () {
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);
    ['program' => $program, 'key' => $key] = mbbsSourceWithKey();

    $response = postApplication(xjmuPayload(), $key)->assertCreated();

    expect(Application::findOrFail($response->json('application_id'))->program_id)->toBe($program->id);
});

it('records the applicant-declared degree and major in the review note', function () {
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);
    ['key' => $key] = mbbsSourceWithKey();

    $id = postApplication(xjmuPayload(), $key)->assertCreated()->json('application_id');

    $note = Application::findOrFail($id)->statusHistory()->where('to_status', 'under_review')->value('note');
    expect($note)->toContain('Mbbs')->toContain('verify');
});

it('rejects ingestion without an API key', function () {
    postApplication(xjmuPayload(), '')
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('requires at least an email or passport number', function () {
    ['key' => $key] = mbbsSourceWithKey();
    $payload = xjmuPayload();
    unset($payload['student']['email'], $payload['student']['passport_no']);

    postApplication($payload, $key)
        ->assertStatus(422)
        ->assertJsonPath('code', 'VALIDATION_ERROR');
});

it('replays idempotent ingestion without creating a duplicate application', function () {
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);
    ['key' => $key] = mbbsSourceWithKey();
    $idem = (string) Str::uuid();

    $first = postApplication(xjmuPayload(), $key, ['Idempotency-Key' => $idem])->assertCreated();
    $second = postApplication(xjmuPayload(), $key, ['Idempotency-Key' => $idem]);

    $second->assertCreated()
        ->assertHeader('Idempotency-Replayed', 'true')
        ->assertJsonPath('application_id', $first->json('application_id'));

    expect(Application::count())->toBe(1)
        ->and(Student::count())->toBe(1);
});
