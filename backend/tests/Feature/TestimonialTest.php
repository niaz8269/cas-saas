<?php

use App\Models\Notification;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

it('lets a student submit one testimonial, held for review, and tells the admins', function () {
    Role::findOrCreate('Admin', 'staff');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    $student = actingAsStudentPortal(['first_name' => 'Sara']);

    $this->postJson('/api/v1/student/testimonial', [
        'quote' => 'The team answered every question quickly and my visa came on time.',
        'headline' => 'MBBS student, Jilin University', 'country' => 'Pakistan', 'consent_public' => true,
    ])->assertCreated()->assertJsonPath('data.status', 'pending');

    $t = Testimonial::sole();
    expect($t->student_id)->toBe($student->id)
        ->and($t->name)->toBe('Sara')
        ->and($t->consent_public)->toBeTrue()
        ->and($t->consent_at)->not->toBeNull();
    expect(Notification::where('user_id', $admin->id)->where('entity_type', 'testimonial')->exists())->toBeTrue();

    // Still hidden until staff approve it.
    $this->getJson('/api/v1/public/testimonials')->assertJsonCount(0, 'data');

    $this->postJson('/api/v1/student/testimonial', [
        'quote' => 'A second one should not be accepted while the first is live.', 'consent_public' => true,
    ])->assertStatus(422);

    $this->getJson('/api/v1/student/testimonial')->assertOk()->assertJsonPath('data.status', 'pending');
});

it('needs the consent box and a real sentence or two', function () {
    actingAsStudentPortal();

    $this->postJson('/api/v1/student/testimonial', ['quote' => 'Great service, really enjoyed working with them.'])
        ->assertStatus(422)->assertJsonValidationErrors(['consent_public']);
    $this->postJson('/api/v1/student/testimonial', ['quote' => 'Good', 'consent_public' => true])
        ->assertStatus(422)->assertJsonValidationErrors(['quote']);
    expect(Testimonial::count())->toBe(0);
});

it('lets a partner agency submit too, under its company name', function () {
    $agent = actingAsAgent(['name' => 'Bright Future Consultancy']);

    $this->postJson('/api/v1/agent/testimonial', [
        'quote' => 'CAS is a reliable partner: clear commissions and fast replies on every case.',
        'headline' => 'Partner agency, Lahore', 'consent_public' => true,
    ])->assertCreated();

    $t = Testimonial::sole();
    expect($t->audience)->toBe('agent')->and($t->agent_id)->toBe($agent->id)->and($t->name)->toBe('Bright Future Consultancy');
});

it('requires a signed-in student or partner to submit', function () {
    $this->postJson('/api/v1/student/testimonial', ['quote' => str_repeat('x', 40), 'consent_public' => true])->assertUnauthorized();
    $this->postJson('/api/v1/agent/testimonial', ['quote' => str_repeat('x', 40), 'consent_public' => true])->assertUnauthorized();
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
