<?php

use App\Models\ApiKey;
use App\Models\ApiSource;
use App\Models\Campaign;
use App\Models\Country;
use App\Models\Lead;
use App\Models\Student;
use App\Models\WebsiteSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * @return array{source: ApiSource, key: string}
 */
function makeSourceWithKey(int $rateLimit = 60): array
{
    $source = ApiSource::factory()->create();
    $plainKey = 'cas_'.Str::random(40);

    $source->apiKeys()->create([
        'key_hash' => ApiKey::hashKey($plainKey),
        'rate_limit' => $rateLimit,
    ]);

    return ['source' => $source, 'key' => $plainKey];
}

function ingest(array $payload, string $key, array $headers = [])
{
    return test()->postJson('/api/v1/ingest/leads', $payload, [
        'X-Api-Key' => $key,
        ...$headers,
    ]);
}

const CLEAN_PAYLOAD = [
    'first_name' => 'Ali',
    'last_name' => 'Khan',
    'email' => 'ali@example.com',
    'phone' => '+92 300 123-4567',
    'country' => 'PK',
    'intake_route' => 'info',
    'message' => 'Interested in MBBS',
];

it('ingests a clean lead with source, campaign and country attribution', function () {
    ['source' => $source, 'key' => $key] = makeSourceWithKey();
    $website = WebsiteSource::factory()->create(['api_source_id' => $source->id, 'domain' => 'study-mbbs.cn']);
    $campaign = Campaign::factory()->create(['utm_campaign' => 'spring-2026-google']);
    Country::factory()->create(['iso2' => 'PK', 'name' => 'Pakistan']);

    $response = ingest([
        ...CLEAN_PAYLOAD,
        'website_domain' => 'study-mbbs.cn',
        'campaign_utm' => 'spring-2026-google',
    ], $key);

    $response->assertCreated()
        ->assertJson(['duplicate' => false, 'student_id' => null, 'review' => false]);

    $lead = Lead::findOrFail($response->json('lead_id'));
    expect($lead->website_source_id)->toBe($website->id)
        ->and($lead->campaign_id)->toBe($campaign->id)
        ->and($lead->country->iso2)->toBe('PK')
        ->and($lead->phone)->toBe('+923001234567') // normalized
        ->and($lead->status)->toBe('new');
});

it('captures the form type and its extra fields', function () {
    ['key' => $key] = makeSourceWithKey();
    Country::factory()->create(['iso2' => 'PK']);

    $response = ingest([
        ...CLEAN_PAYLOAD,
        'email' => 'evt@example.com',
        'phone' => '+92700111',
        'form_type' => 'Event Registration',
        'fields' => ['event' => 'China Expo 2026', 'event_date' => '2026-09-10', 'seats' => 2],
    ], $key)->assertCreated();

    $lead = Lead::findOrFail($response->json('lead_id'));
    expect($lead->form_type)->toBe('event_registration') // normalized to a slug
        ->and($lead->meta['form']['event'])->toBe('China Expo 2026')
        ->and($lead->meta['form']['event_date'])->toBe('2026-09-10')
        ->and($lead->meta['form']['seats'])->toBe('2'); // scalars stringified
});

it('rejects requests without a key', function () {
    ingest(CLEAN_PAYLOAD, '')
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('rejects revoked keys', function () {
    ['source' => $source, 'key' => $key] = makeSourceWithKey();
    $source->apiKeys()->update(['revoked_at' => now()]);

    ingest(CLEAN_PAYLOAD, $key)->assertStatus(401);
});

it('rejects keys of inactive sources', function () {
    ['source' => $source, 'key' => $key] = makeSourceWithKey();
    $source->update(['is_active' => false]);

    ingest(CLEAN_PAYLOAD, $key)->assertStatus(401);
});

it('rate limits per key', function () {
    ['key' => $key] = makeSourceWithKey(rateLimit: 2);
    Country::factory()->create(['iso2' => 'PK']);

    ingest([...CLEAN_PAYLOAD, 'email' => 'a1@example.com', 'phone' => '+92111'], $key)->assertCreated();
    ingest([...CLEAN_PAYLOAD, 'email' => 'a2@example.com', 'phone' => '+92222'], $key)->assertCreated();

    // Third call exceeds the 2/min per-key limit.
    ingest([...CLEAN_PAYLOAD, 'email' => 'a3@example.com', 'phone' => '+92333'], $key)
        ->assertStatus(429)
        ->assertJsonPath('code', 'RATE_LIMITED');
});

it('replays idempotent requests without creating duplicates', function () {
    ['key' => $key] = makeSourceWithKey();
    Country::factory()->create(['iso2' => 'PK']);
    $idempotencyKey = (string) Str::uuid();

    $first = ingest(CLEAN_PAYLOAD, $key, ['Idempotency-Key' => $idempotencyKey])->assertCreated();
    $second = ingest(CLEAN_PAYLOAD, $key, ['Idempotency-Key' => $idempotencyKey]);

    $second->assertCreated()
        ->assertHeader('Idempotency-Replayed', 'true')
        ->assertJsonPath('lead_id', $first->json('lead_id'));

    expect(Lead::count())->toBe(1);
});

it('flags exact student matches as duplicate with 409', function () {
    ['key' => $key] = makeSourceWithKey();
    Country::factory()->create(['iso2' => 'PK']);
    $student = Student::factory()->create(['email' => 'ali@example.com']);

    $response = ingest(CLEAN_PAYLOAD, $key);

    $response->assertStatus(409)
        ->assertJsonPath('code', 'DUPLICATE')
        ->assertJsonPath('message', 'Matched existing student')
        ->assertJsonPath('student_id', $student->id);

    $lead = Lead::findOrFail($response->json('lead_id'));
    expect($lead->status)->toBe('duplicate')
        ->and($lead->student_id)->toBe($student->id);
});

it('links duplicate leads to the original open lead', function () {
    ['key' => $key] = makeSourceWithKey();
    Country::factory()->create(['iso2' => 'PK']);
    $original = Lead::factory()->create(['phone' => '+923001234567']);

    $response = ingest(CLEAN_PAYLOAD, $key);

    $response->assertStatus(409)
        ->assertJsonPath('code', 'DUPLICATE')
        ->assertJsonPath('duplicate_of', $original->id);

    expect(Lead::findOrFail($response->json('lead_id'))->duplicate_of)->toBe($original->id);
});

it('flags probable name matches for review without auto-linking', function () {
    ['key' => $key] = makeSourceWithKey();
    Country::factory()->create(['iso2' => 'PK']);
    $student = Student::factory()->create([
        'first_name' => 'Ali', 'last_name' => 'Khan',
        'email' => 'other@example.com', 'phone' => '+920000000',
    ]);

    $response = ingest([...CLEAN_PAYLOAD, 'email' => 'new-ali@example.com', 'phone' => '+92999'], $key);

    $response->assertCreated()->assertJsonPath('review', true);

    $lead = Lead::findOrFail($response->json('lead_id'));
    expect($lead->status)->toBe('new')
        ->and($lead->student_id)->toBeNull()
        ->and($lead->meta['dedup']['probable_student_id'])->toBe($student->id);
});

it('requires at least an email or phone', function () {
    ['key' => $key] = makeSourceWithKey();

    ingest(['first_name' => 'NoContact', 'last_name' => 'Person'], $key)
        ->assertStatus(422)
        ->assertJsonPath('code', 'VALIDATION_ERROR');
});
