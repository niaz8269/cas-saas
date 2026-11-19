<?php

use App\Models\AuditLog;
use App\Models\ExclusiveMaterial;
use App\Models\ExclusiveOffer;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    config(['filesystems.documents_disk' => 'local']);
    Storage::fake('local');
});

function staffWithRole(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole($role);
    Sanctum::actingAs($user, guard: 'staff');

    return $user;
}

function offerPayload(array $over = []): array
{
    return array_merge([
        'title' => 'Dalian MBBS exclusive',
        'offer_type' => 'other',
        'audience' => 'partners',
        'summary' => 'Only through CAS agencies.',
        'status' => 'published',
        'commission_rates' => [
            'partner' => ['value' => 3000],
            'sub' => ['value' => 2000],
            'sub_sub' => ['value' => 1000],
        ],
        'commission_notes' => 'Paid after the first-year fee.',
        'fee_structure' => [['label' => 'Tuition', 'amount' => 30000, 'currency' => 'CNY', 'note' => 'per year']],
        'eligible_nationalities' => [],
        'restricted_nationalities' => ['Country A'],
        'conditions' => 'Age 17 to 25.',
    ], $over);
}

it('lets an admin create, edit and remove an exclusive, and keeps the first publish date', function () {
    staffWithRole('Admin');

    $created = postJson('/api/v1/exclusives', offerPayload())->assertCreated()->json('data');
    expect($created['slug'])->toBe('dalian-mbbs-exclusive')
        ->and($created['commission_rates']['sub_sub'])->toEqual(['type' => 'fixed', 'value' => 1000, 'currency' => 'CNY'])
        ->and($created['published_at'])->not->toBeNull();

    putJson('/api/v1/exclusives/'.$created['id'], offerPayload(['title' => 'Renamed', 'conditions' => 'New terms.']))
        ->assertOk()->assertJsonPath('data.conditions', 'New terms.')->assertJsonPath('data.published_at', $created['published_at']);

    putJson('/api/v1/exclusives/'.$created['id'], offerPayload(['status' => 'draft']))->assertOk()->assertJsonPath('data.published_at', null);

    deleteJson('/api/v1/exclusives/'.$created['id'])->assertOk();
    expect(ExclusiveOffer::count())->toBe(0);
});

it('lets a counselor read exclusives but not change them, and keeps other roles out', function () {
    $offer = ExclusiveOffer::create(['title' => 'X', 'slug' => 'x', 'offer_type' => 'other', 'status' => 'published']);

    staffWithRole('Counselor');
    getJson('/api/v1/exclusives')->assertOk()->assertJsonCount(1, 'data');
    getJson('/api/v1/exclusives/'.$offer->id)->assertOk();
    postJson('/api/v1/exclusives', offerPayload())->assertForbidden();
    putJson('/api/v1/exclusives/'.$offer->id, offerPayload())->assertForbidden();
    deleteJson('/api/v1/exclusives/'.$offer->id)->assertForbidden();

    staffWithRole('Finance');
    getJson('/api/v1/exclusives')->assertForbidden();
});

it('validates commission, fees and nationality entries', function () {
    staffWithRole('Admin');

    postJson('/api/v1/exclusives', offerPayload(['commission_rates' => ['partner' => ['value' => -5]]]))->assertUnprocessable();
    postJson('/api/v1/exclusives', offerPayload(['fee_structure' => [['amount' => 5]]]))->assertUnprocessable();
    postJson('/api/v1/exclusives', offerPayload(['status' => 'live']))->assertUnprocessable();
    postJson('/api/v1/exclusives', offerPayload(['audience' => 'everyone']))->assertUnprocessable();
    postJson('/api/v1/exclusives', collect(offerPayload())->except('audience')->all())->assertUnprocessable();
});

it('shows an agency only published offers, with only its own level commission and no internal fields', function () {
    ExclusiveOffer::create(offerPayload(['slug' => 'live', 'commission_rates' => ['partner' => ['value' => 3000], 'sub' => ['value' => 2000]]]));
    ExclusiveOffer::create(offerPayload(['title' => 'Hidden draft', 'slug' => 'draft', 'status' => 'draft']));

    actingAsAgent(['type' => 'sub']);
    $response = getJson('/api/v1/agent/exclusives')->assertOk()->assertJsonCount(1, 'data');

    $offer = $response->json('data.0');
    expect($offer['commission'])->toMatchArray(['value' => 2000.0])
        ->and($offer['agency_level'])->toBe('sub')
        ->and($offer)->not->toHaveKeys(['commission_rates', 'status', 'sort_order']);
});

it('keeps agencies that are not approved, students and visitors out', function () {
    getJson('/api/v1/agent/exclusives')->assertUnauthorized();

    actingAsAgent(['status' => 'pending']);
    getJson('/api/v1/agent/exclusives')->assertForbidden();

    actingAsStudentPortal();
    getJson('/api/v1/agent/exclusives')->assertForbidden();
});

it('stores files privately, serves them to agencies only while the offer is published, and logs each download', function () {
    staffWithRole('Admin');
    $offer = postJson('/api/v1/exclusives', offerPayload())->json('data');

    $file = UploadedFile::fake()->create('brochure.pdf', 200, 'application/pdf');
    $material = postJson('/api/v1/exclusives/'.$offer['id'].'/materials', ['title' => 'Brochure', 'category' => 'brochure', 'file' => $file])
        ->assertCreated()->json('data');
    $stored = ExclusiveMaterial::find($material['id']);
    Storage::disk('local')->assertExists($stored->path);

    postJson('/api/v1/exclusive-materials', ['title' => 'Logo', 'category' => 'other', 'file' => UploadedFile::fake()->create('logo.png', 20, 'image/png')])->assertCreated();
    postJson('/api/v1/exclusives/'.$offer['id'].'/materials', ['title' => 'Bad', 'category' => 'other', 'file' => UploadedFile::fake()->create('run.exe', 10)])->assertUnprocessable();

    $agent = actingAsAgent();
    getJson('/api/v1/agent/exclusives')->assertOk()->assertJsonCount(1, 'library')->assertJsonCount(1, 'data.0.materials')->assertJsonMissingPath('data.0.materials.0.download_count');
    getJson('/api/v1/agent/exclusive-materials/'.$material['id'].'/download')->assertOk()->assertDownload('brochure.pdf');

    expect($stored->refresh()->download_count)->toBe(1)
        ->and(AuditLog::where('action', 'download')->where('auditable_id', $stored->id)->first()->new_values['agent_id'])->toBe($agent->id);

    // Back to draft: the agency can no longer fetch the file.
    ExclusiveOffer::find($offer['id'])->update(['status' => 'draft']);
    getJson('/api/v1/agent/exclusive-materials/'.$material['id'].'/download')->assertNotFound();
});

it('keeps private exclusives, and their files, from agencies while the CAS team sees them', function () {
    $partners = ExclusiveOffer::create(offerPayload(['slug' => 'for-partners', 'title' => 'For partners']));
    $private = ExclusiveOffer::create(offerPayload(['slug' => 'cas-only', 'title' => 'CAS only', 'audience' => 'private']));
    $file = ExclusiveMaterial::create(['exclusive_offer_id' => $private->id, 'title' => 'Internal prices', 'category' => 'price_list', 'disk' => 'local', 'path' => 'exclusives/x.pdf', 'original_name' => 'x.pdf', 'size' => 10]);
    Storage::disk('local')->put('exclusives/x.pdf', 'pdf');

    // Counselors and admins see both, and can filter by who it is for.
    staffWithRole('Counselor');
    getJson('/api/v1/exclusives')->assertOk()->assertJsonCount(2, 'data');
    expect(collect(getJson('/api/v1/exclusives?filter[audience]=private')->json('data'))->pluck('title')->all())->toBe(['CAS only']);
    getJson('/api/v1/exclusives/'.$private->id)->assertOk()->assertJsonPath('data.audience', 'private');
    getJson('/api/v1/exclusive-materials/'.$file->id.'/download')->assertOk();

    // An approved agency sees only the partner exclusives and cannot fetch a private file.
    actingAsAgent();
    $titles = collect(getJson('/api/v1/agent/exclusives')->assertOk()->json('data'))->pluck('title')->all();
    expect($titles)->toBe(['For partners'])->and($titles)->not->toContain('CAS only');
    getJson('/api/v1/agent/exclusive-materials/'.$file->id.'/download')->assertNotFound();
    expect($partners->audience)->toBe('partners');
});

it('links an exclusive to a program or scholarship and takes the university from it', function () {
    staffWithRole('Admin');
    $uni = University::factory()->create();
    $program = Program::factory()->create(['university_id' => $uni->id]);
    $scholarship = Scholarship::factory()->create(['university_id' => $uni->id]);

    $a = postJson('/api/v1/exclusives', offerPayload(['offer_type' => 'program', 'program_id' => $program->id, 'scholarship_id' => $scholarship->id]))->assertCreated();
    expect($a->json('data.university_id'))->toBe($uni->id)->and($a->json('data.program_id'))->toBe($program->id)->and($a->json('data.scholarship_id'))->toBeNull();

    $b = postJson('/api/v1/exclusives', offerPayload(['title' => 'Award', 'offer_type' => 'scholarship', 'scholarship_id' => $scholarship->id]))->assertCreated();
    expect($b->json('data.university_id'))->toBe($uni->id)->and($b->json('data.scholarship.name'))->toBe($scholarship->name)->and($b->json('data.program_id'))->toBeNull();
});

it('looks up programs, scholarships and universities by name or university for the form pickers', function () {
    staffWithRole('Admin');
    $hebei = University::factory()->create(['name' => 'Hebei University']);
    $zhejiang = University::factory()->create(['name' => 'Zhejiang Chinese Medical University']);
    Program::factory()->create(['university_id' => $hebei->id, 'name' => 'Clinical Medicine (MBBS)']);
    Program::factory()->create(['university_id' => $zhejiang->id, 'name' => 'Clinical Medicine (MBBS)']);

    $all = getJson('/api/v1/exclusives/lookup?type=program&q=mbbs')->assertOk();
    expect($all->json('total'))->toBe(2);

    $one = getJson('/api/v1/exclusives/lookup?type=program&q=mbbs+zhejiang')->assertOk();
    expect($one->json('total'))->toBe(1)->and($one->json('data.0.label'))->toBe('Clinical Medicine (MBBS) · Zhejiang Chinese Medical University');

    expect(getJson('/api/v1/exclusives/lookup?type=university&q=hebei')->json('data.0.label'))->toBe('Hebei University');
    getJson('/api/v1/exclusives/lookup?type=bogus')->assertUnprocessable();

    staffWithRole('Counselor');
    getJson('/api/v1/exclusives/lookup?type=program')->assertForbidden();
});
