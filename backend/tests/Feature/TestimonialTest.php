<?php

use App\Models\Notification;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function makeTestimonial(array $over = []): Testimonial
{
    return Testimonial::create(array_merge([
        'audience' => 'student', 'name' => 'Ali', 'headline' => 'MBBS student',
        'quote' => 'CAS guided me through every step of my application.',
        'consent_public' => true, 'consent_at' => now(), 'status' => 'approved', 'approved_at' => now(),
    ], $over));
}

it('shows only approved, consented testimonials on the public site, and never internal fields', function () {
    makeTestimonial(['name' => 'Shown']);
    makeTestimonial(['name' => 'Pending', 'status' => 'pending']);
    makeTestimonial(['name' => 'Rejected', 'status' => 'rejected']);
    makeTestimonial(['name' => 'No consent', 'consent_public' => false]);
    makeTestimonial(['name' => 'Partner', 'audience' => 'agent']);

    $all = $this->getJson('/api/v1/public/testimonials')->assertOk();
    expect(collect($all->json('data'))->pluck('name')->all())->toEqualCanonicalizing(['Shown', 'Partner']);

    $students = $this->getJson('/api/v1/public/testimonials?audience=student')->assertOk();
    expect($students->json('data'))->toHaveCount(1)
        ->and($students->json('data.0'))->not->toHaveKeys(['student_id', 'agent_id', 'status', 'consent_at']);
});

function studentPayload(array $over = []): array
{
    return array_merge([
        'display_name' => 'Sara Khan', 'photo_path' => '/uploads/testimonials/'.Str::uuid().'.webp',
        'country_code' => 'PK', 'university' => 'Jilin University', 'degree' => 'bachelor', 'program' => 'MBBS',
        'quote' => 'The team answered every question quickly and my visa came on time.',
        'consent_public' => true,
    ], $over);
}

it('lets a student submit one testimonial with the details we require, held for review', function () {
    Role::findOrCreate('Admin', 'staff');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    $student = actingAsStudentPortal(['first_name' => 'Sara']);

    $this->postJson('/api/v1/student/testimonial', studentPayload(['services' => ['admission', 'visa'], 'found_us' => 'friend', 'recommend' => true, 'intake_year' => 2026]))
        ->assertCreated()->assertJsonPath('data.status', 'pending');

    $t = Testimonial::sole();
    expect($t->student_id)->toBe($student->id)
        ->and($t->name)->toBe('Sara Khan')
        ->and($t->country)->toBe('Pakistan')
        ->and($t->country_code)->toBe('PK')
        ->and($t->university)->toBe('Jilin University')
        ->and($t->degree)->toBe('bachelor')
        ->and($t->program)->toBe('MBBS')
        ->and($t->photo_path)->toContain('testimonials/')
        ->and($t->services)->toBe(['admission', 'visa'])
        ->and($t->consent_public)->toBeTrue()
        ->and($t->consent_at)->not->toBeNull();
    expect(Notification::where('user_id', $admin->id)->where('entity_type', 'testimonial')->exists())->toBeTrue();

    // Still hidden until staff approve it.
    $this->getJson('/api/v1/public/testimonials')->assertJsonCount(0, 'data');

    $this->postJson('/api/v1/student/testimonial', studentPayload())->assertStatus(422);
    $this->getJson('/api/v1/student/testimonial')->assertOk()->assertJsonPath('data.status', 'pending');
});

it('requires a student to give name, photo, nationality, university, degree, major and their experience', function () {
    actingAsStudentPortal();

    $this->postJson('/api/v1/student/testimonial', ['consent_public' => true])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['display_name', 'photo_path', 'country_code', 'university', 'degree', 'program', 'quote']);

    $this->postJson('/api/v1/student/testimonial', studentPayload(['consent_public' => false]))->assertStatus(422)->assertJsonValidationErrors(['consent_public']);
    $this->postJson('/api/v1/student/testimonial', studentPayload(['quote' => 'Good']))->assertStatus(422)->assertJsonValidationErrors(['quote']);
    $this->postJson('/api/v1/student/testimonial', studentPayload(['degree' => 'wizard']))->assertStatus(422)->assertJsonValidationErrors(['degree']);
    expect(Testimonial::count())->toBe(0);
});

it('only accepts a photo that this app stored, never an arbitrary link', function () {
    actingAsStudentPortal();

    foreach (['https://evil.example/pixel.png', '/uploads/other/abc.webp', '../../etc/passwd', '/uploads/testimonials/not-a-uuid.webp'] as $bad) {
        $this->postJson('/api/v1/student/testimonial', studentPayload(['photo_path' => $bad]))
            ->assertStatus(422)->assertJsonValidationErrors(['photo_path']);
    }
    expect(Testimonial::count())->toBe(0);
});

it('stores a student photo as WebP and returns its path', function () {
    actingAsStudentPortal();
    $file = UploadedFile::fake()->image('me.jpg', 400, 400);

    $res = $this->postJson('/api/v1/student/testimonial/photo', ['image' => $file])->assertCreated();

    expect($res->json('path'))->toMatch('#testimonials/[0-9a-f-]{36}\.webp$#');
    $this->postJson('/api/v1/student/testimonial', studentPayload(['photo_path' => $res->json('path')]))->assertCreated();

    // Not an image / too big is refused.
    $this->postJson('/api/v1/student/testimonial/photo', ['image' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf')])->assertStatus(422);
});

it('lets a partner agency submit too, under its company name, without a photo', function () {
    $agent = actingAsAgent(['name' => 'Bright Future Consultancy']);

    $this->postJson('/api/v1/agent/testimonial', [
        'quote' => 'CAS is a reliable partner: clear commissions and fast replies on every case.',
        'headline' => 'Partner agency, Lahore', 'partner_since' => '2024', 'students_referred' => '11-50',
        'services' => ['commission', 'portal'], 'recommend' => true, 'consent_public' => true,
    ])->assertCreated();

    $t = Testimonial::sole();
    expect($t->audience)->toBe('agent')->and($t->agent_id)->toBe($agent->id)->and($t->name)->toBe('Bright Future Consultancy')
        ->and($t->partner_since)->toBe('2024')->and($t->students_referred)->toBe('11-50');
});

it('requires a signed-in student or partner to submit', function () {
    $this->postJson('/api/v1/student/testimonial', studentPayload())->assertUnauthorized();
    $this->postJson('/api/v1/agent/testimonial', ['quote' => str_repeat('x', 40), 'consent_public' => true])->assertUnauthorized();
    $this->postJson('/api/v1/student/testimonial/photo', [])->assertUnauthorized();
});

it('shows the public details and the photo, never the private fields', function () {
    actingAsStudentPortal();
    $this->postJson('/api/v1/student/testimonial', studentPayload(['found_us' => 'friend', 'recommend' => true]))->assertCreated();
    Testimonial::sole()->update(['status' => 'approved', 'approved_at' => now()]);

    $row = $this->getJson('/api/v1/public/testimonials?audience=student')->assertOk()->json('data.0');

    expect($row)->toMatchArray([
        'name' => 'Sara Khan', 'country' => 'Pakistan', 'country_code' => 'PK', 'university' => 'Jilin University', 'degree' => 'bachelor',
        'program' => 'MBBS', 'verified' => true,
    ])->and($row['photo_url'])->toContain('testimonials/')
        ->and($row)->not->toHaveKeys(['found_us', 'student_id', 'agent_id', 'status', 'photo_path', 'rating']);
});

it('summarises how many published and the share who recommend, without any star rating', function () {
    makeTestimonial(['recommend' => true]);
    makeTestimonial(['recommend' => true]);
    makeTestimonial(['recommend' => false]);
    makeTestimonial(['status' => 'pending', 'recommend' => false]); // not counted

    $summary = $this->getJson('/api/v1/public/testimonials')->json('summary');

    expect($summary)->toEqual(['count' => 3, 'recommend_percent' => 67]);
});

it('marks a testimonial typed in by staff as not verified', function () {
    makeTestimonial(['student_id' => null]);

    expect($this->getJson('/api/v1/public/testimonials')->json('data.0.verified'))->toBeFalse();
});

it('lets content staff approve, edit, order and delete, and publishes only on approval', function () {
    actingAsStaffWith(['content.view.global', 'content.manage.global']);
    $t = makeTestimonial(['status' => 'pending']);

    $this->getJson('/api/v1/testimonials?filter[status]=pending')->assertOk()->assertJsonPath('data.0.id', $t->id);
    $this->patchJson("/api/v1/testimonials/{$t->id}", ['quote' => 'Edited to fix a typo in the original.', 'sort_order' => 1, 'status' => 'approved'])
        ->assertOk()->assertJsonPath('data.status', 'approved');

    $this->getJson('/api/v1/public/testimonials')->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.quote', 'Edited to fix a typo in the original.');

    $this->deleteJson("/api/v1/testimonials/{$t->id}")->assertNoContent();
    $this->getJson('/api/v1/public/testimonials')->assertJsonCount(0, 'data');
});

it('refuses to publish a testimonial whose author did not agree to it', function () {
    actingAsStaffWith(['content.view.global', 'content.manage.global']);
    $t = makeTestimonial(['status' => 'pending', 'consent_public' => false]);

    $this->patchJson("/api/v1/testimonials/{$t->id}", ['status' => 'approved'])->assertStatus(422);
    expect($t->fresh()->status)->toBe('pending');
});

it('needs consent confirmed when staff enter one by hand', function () {
    actingAsStaffWith(['content.view.global', 'content.manage.global']);
    $payload = ['audience' => 'student', 'name' => 'Omar', 'quote' => 'Written to us by email, shared with permission.'];

    $this->postJson('/api/v1/testimonials', $payload)->assertStatus(422)->assertJsonValidationErrors(['consent_public']);
    $this->postJson('/api/v1/testimonials', $payload + ['consent_public' => true])->assertCreated();
    $this->getJson('/api/v1/public/testimonials')->assertJsonCount(1, 'data');
});

it('keeps testimonials management away from staff without the content permission', function () {
    actingAsStaffWith(['finance.view.global']);

    $this->getJson('/api/v1/testimonials')->assertForbidden();
    $this->postJson('/api/v1/testimonials', [])->assertForbidden();
});

it('rejects a nationality that is not a real country code and fills the country name from the code', function () {
    actingAsStudentPortal();

    $this->postJson('/api/v1/student/testimonial', studentPayload(['country_code' => 'ZZ']))->assertStatus(422)->assertJsonValidationErrors(['country_code']);
    $this->postJson('/api/v1/student/testimonial', studentPayload(['country_code' => 'Pakistan']))->assertStatus(422);
    $this->postJson('/api/v1/student/testimonial', studentPayload(['country_code' => 'NG']))->assertCreated();

    expect(Testimonial::sole()->country)->toBe('Nigeria');
});
