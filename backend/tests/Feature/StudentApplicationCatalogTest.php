<?php

use App\Models\Country;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Admissions\ApplicationCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists countries for the nationality picker', function () {
    actingAsStudentPortal();
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);

    $this->getJson('/api/v1/student/countries')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Pakistan', 'iso2' => 'PK']);
});

/** Seed the general document set the wizard falls back to. */
function seedGeneralDocumentTypes(): void
{
    foreach (ApplicationCatalog::GENERAL_DOCUMENTS as $name) {
        DocumentType::factory()->create(['name' => $name]);
    }
}

it('requires the student guard for availability', function () {
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertUnauthorized();
});

it('validates the degree and funding options', function () {
    actingAsStudentPortal();

    $this->getJson('/api/v1/student/applications/availability?degree=wizardry&funding=self')
        ->assertStatus(422)
        ->assertJsonValidationErrors('degree');

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=maybe')
        ->assertStatus(422)
        ->assertJsonValidationErrors('funding');
});

it('offers scholarship funding only when a matching award exists', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active']);

    // No scholarships yet → self only.
    $this->getJson('/api/v1/student/applications/funding-options?degree=mbbs')
        ->assertOk()
        ->assertJsonPath('data.self', true)
        ->assertJsonPath('data.scholarship', false)
        ->assertJsonPath('data.partial', false);

    // Admin sets a full award at that university → scholarship unlocks.
    Scholarship::factory()->create(['university_id' => $uni->id, 'type' => 'full', 'coverage' => 'Full tuition', 'status' => 'active']);

    $this->getJson('/api/v1/student/applications/funding-options?degree=mbbs')
        ->assertOk()
        ->assertJsonPath('data.scholarship', true)
        ->assertJsonPath('data.partial', false);
});

it('returns programs for a degree tile, excluding other tiles', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active']);

    Program::factory()->create(['university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Computer Science', 'level' => 'bachelor', 'status' => 'active']);

    // MBBS tile → only the medical bachelor.
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'MBBS');

    // BS tile → the general bachelor, not MBBS.
    $this->getJson('/api/v1/student/applications/availability?degree=bs&funding=self')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Computer Science');
});

it('includes the applicable CAS service charge for the funding', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active']);
    Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active',
        'service_charges' => ['currency' => 'USD', 'self' => ['student' => 400, 'agent' => 200]],
    ]);

    $response = $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonPath('data.0.service_charge.currency', 'USD');

    // The student rate (400), not the agent rate (200).
    expect((float) $response->json('data.0.service_charge.amount'))->toBe(400.0);
});

it('keeps only universities with a matching scholarship in scholarship mode', function () {
    actingAsStudentPortal();
    $withAward = University::factory()->create(['status' => 'active']);
    $withoutAward = University::factory()->create(['status' => 'active']);

    Program::factory()->create(['university_id' => $withAward->id, 'name' => 'MBBS', 'level' => 'bachelor']);
    Program::factory()->create(['university_id' => $withoutAward->id, 'name' => 'MBBS', 'level' => 'bachelor']);
    Scholarship::factory()->create([
        'university_id' => $withAward->id,
        'type' => 'full',
        'coverage' => 'Full tuition',
        'status' => 'active',
    ]);

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=scholarship')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.university.id', $withAward->id)
        ->assertJsonCount(1, 'data.0.scholarships');

    // A partial request must not match a full-only award.
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=partial')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('resolves the general document set when a program has no configured docs', function () {
    seedGeneralDocumentTypes();
    actingAsStudentPortal();
    $program = Program::factory()->create(['requirements' => ['min_age' => 18]]);

    $this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()
        ->assertJsonCount(count(ApplicationCatalog::GENERAL_DOCUMENTS), 'data')
        ->assertJsonFragment(['name' => 'Passport'])
        ->assertJsonFragment(['name' => 'CV / Resume']);
});

it('uses the admin-configured program docs when present', function () {
    seedGeneralDocumentTypes();
    actingAsStudentPortal();
    $passport = DocumentType::where('name', 'Passport')->first();
    $cv = DocumentType::where('name', 'CV / Resume')->first();
    $program = Program::factory()->create(['requirements' => ['documents' => [$passport->id, $cv->id]]]);

    $this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment(['name' => 'Passport'])
        ->assertJsonFragment(['name' => 'CV / Resume']);
});

it('pages the programs, searches by program, university or city, and filters, so a huge catalog is never loaded at once', function () {
    actingAsStudentPortal();
    $dalian = University::factory()->create(['status' => 'active', 'name' => 'Dalian Tech University', 'slug' => 'dalian-tech', 'city' => 'Dalian']);
    $harbin = University::factory()->create(['status' => 'active', 'name' => 'Harbin Normal University', 'slug' => 'harbin-normal', 'city' => 'Harbin']);
    foreach (range(1, 12) as $i) {
        Program::factory()->create(['university_id' => $dalian->id, 'name' => "Engineering Subject $i", 'level' => 'bachelor', 'status' => 'active', 'teaching_language' => 'English']);
    }
    Program::factory()->create(['university_id' => $harbin->id, 'name' => 'Education Studies', 'level' => 'bachelor', 'status' => 'active', 'teaching_language' => 'Chinese']);
    Program::factory()->create(['university_id' => $harbin->id, 'name' => 'Medicine (MBBS)', 'level' => 'bachelor', 'status' => 'active']);

    $base = '/api/v1/student/applications/availability?degree=bs&funding=self';

    // Only one page comes back, with the total, and the filter boxes arrive with the first page only.
    $first = $this->getJson($base.'&per_page=5')->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('meta.total', 13)->assertJsonPath('meta.last_page', 3);
    expect($first->json('facets.languages'))->toBe(['Chinese', 'English'])
        ->and($first->json('facets.cities'))->toBe(['Dalian', 'Harbin'])
        ->and(collect($first->json('facets.universities'))->pluck('name')->all())->toBe(['Dalian Tech University', 'Harbin Normal University']);
    $second = $this->getJson($base.'&per_page=5&page=2')->assertOk()->assertJsonCount(5, 'data');
    expect($second->json('facets'))->toBeNull()
        ->and(array_intersect(collect($first->json('data'))->pluck('id')->all(), collect($second->json('data'))->pluck('id')->all()))->toBe([]);

    // Search words can come from the program, the university or the city; every word must match.
    expect($this->getJson($base.'&q=education')->assertOk()->json('meta.total'))->toBe(1)
        ->and($this->getJson($base.'&q=dalian+engineering')->assertOk()->json('meta.total'))->toBe(12)
        ->and($this->getJson($base.'&q=harbin')->assertOk()->json('meta.total'))->toBe(1)
        ->and($this->getJson($base.'&q=engineering+harbin')->assertOk()->json('meta.total'))->toBe(0)
        ->and($this->getJson($base.'&q=%25')->assertOk()->json('meta.total'))->toBe(0);

    // Filters.
    expect($this->getJson($base.'&language=Chinese')->assertOk()->json('meta.total'))->toBe(1)
        ->and($this->getJson($base.'&city=Dalian')->assertOk()->json('meta.total'))->toBe(12)
        ->and($this->getJson($base.'&university='.$harbin->slug)->assertOk()->json('meta.total'))->toBe(1)
        ->and($this->getJson($base.'&university_id='.$dalian->id)->assertOk()->json('meta.total'))->toBe(12);

    // A page size above the limit is refused.
    $this->getJson($base.'&per_page=500')->assertUnprocessable();
});

it('lists only universities with a matching scholarship in the scholarship modes, still paged', function () {
    actingAsStudentPortal();
    $funded = University::factory()->create(['status' => 'active']);
    $unfunded = University::factory()->create(['status' => 'active']);
    Program::factory()->count(3)->create(['university_id' => $funded->id, 'level' => 'master', 'status' => 'active']);
    Program::factory()->count(2)->create(['university_id' => $unfunded->id, 'level' => 'master', 'status' => 'active']);
    Scholarship::factory()->create(['university_id' => $funded->id, 'status' => 'active', 'coverage' => 'Full tuition and stipend', 'name' => 'Full Award']);

    $response = $this->getJson('/api/v1/student/applications/availability?degree=master&funding=scholarship&per_page=2')->assertOk();

    expect($response->json('meta.total'))->toBe(3)
        ->and($response->json('data'))->toHaveCount(2)
        ->and($response->json('data.0.scholarships.0.name'))->toBe('Full Award');
});

it('retries a misspelled search with the closest real spelling and says so', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active', 'name' => 'Harbin Institute of Technology', 'city' => 'Harbin']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Civil Engineering', 'level' => 'master', 'status' => 'active']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Clinical Medicine', 'level' => 'master', 'status' => 'active']);

    $response = $this->getJson('/api/v1/student/applications/availability?degree=master&funding=self&q=herbin+enginering')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.name'))->toBe('Civil Engineering')
        ->and($response->json('suggestion'))->toBe(['original' => 'herbin enginering', 'query' => 'harbin engineering']);

    // Nothing close: no program, no suggestion.
    $none = $this->getJson('/api/v1/student/applications/availability?degree=master&funding=self&q=zzzzqxw')->assertOk();
    expect($none->json('meta.total'))->toBe(0)->and($none->json('suggestion'))->toBeNull();
});
