<?php

use App\Models\Lead;
use App\Models\Student;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const COUNSELOR_PERMS = ['leads.view.assigned', 'leads.update.assigned', 'leads.convert.assigned'];
const LEAD_ADMIN_PERMS = [
    'leads.view.global', 'leads.update.global', 'leads.assign.global', 'leads.convert.assigned',
];

it('logs a note on the lead timeline and lists it', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    $lead = Lead::factory()->create();

    $this->postJson("/api/v1/leads/{$lead->id}/notes", ['body' => 'Called — call back Tuesday'])
        ->assertCreated()
        ->assertJsonPath('data.type', 'note');

    $this->getJson("/api/v1/leads/{$lead->id}/timeline")
        ->assertOk()
        ->assertJsonPath('data.0.body', 'Called — call back Tuesday');
});

it('logs a typed activity (call) on the lead timeline', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    $lead = Lead::factory()->create();

    $this->postJson("/api/v1/leads/{$lead->id}/notes", [
        'body' => 'Spoke for 10 min, interested in MBBS',
        'type' => 'call',
    ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'call');
});

it('rejects an unknown activity type', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    $lead = Lead::factory()->create();

    $this->postJson("/api/v1/leads/{$lead->id}/notes", ['body' => 'x', 'type' => 'carrier-pigeon'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('type');
});

it('records a status change on the lead timeline', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    $lead = Lead::factory()->create(['status' => 'new']);

    $this->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'contacted'])->assertOk();

    $response = $this->getJson("/api/v1/leads/{$lead->id}/timeline")->assertOk();
    expect(collect($response->json('data'))->pluck('type'))->toContain('status');
});

it('shows counselors only their assigned leads', function () {
    $counselor = actingAsStaffWith(COUNSELOR_PERMS);
    $mine = Lead::factory()->assigned()->create(['assigned_user_id' => $counselor->id]);
    Lead::factory()->count(2)->create(); // unassigned / other

    $response = $this->getJson('/api/v1/leads')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($mine->id);
});

it('shows admins every lead', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    Lead::factory()->count(3)->create();

    $this->getJson('/api/v1/leads')->assertOk()->assertJsonPath('meta.total', 3);
});

it('blocks counselors from viewing an unassigned lead directly', function () {
    actingAsStaffWith(COUNSELOR_PERMS);
    $other = Lead::factory()->create();

    $this->getJson("/api/v1/leads/{$other->id}")->assertStatus(403);
});

it('lets admins assign a lead, creating the follow-up task', function () {
    actingAsStaffWith(LEAD_ADMIN_PERMS);
    $counselor = User::factory()->create();
    $lead = Lead::factory()->create();

    $this->postJson("/api/v1/leads/{$lead->id}/assign", ['assigned_user_id' => $counselor->id])
        ->assertOk()
        ->assertJsonPath('data.status', 'assigned')
        ->assertJsonPath('data.assignee.id', $counselor->id);

    expect(Task::where('assignee_id', $counselor->id)->where('related_id', $lead->id)->exists())->toBeTrue();
});

it('denies assignment without leads.assign.global', function () {
    $counselor = actingAsStaffWith(COUNSELOR_PERMS);
    $lead = Lead::factory()->assigned()->create(['assigned_user_id' => $counselor->id]);

    $this->postJson("/api/v1/leads/{$lead->id}/assign", ['assigned_user_id' => $counselor->id])
        ->assertStatus(403);
});

it('converts an assigned lead into a permanent student', function () {
    $counselor = actingAsStaffWith(COUNSELOR_PERMS);
    $lead = Lead::factory()->assigned()->create([
        'assigned_user_id' => $counselor->id,
        'first_name' => 'Ali',
        'last_name' => 'Khan',
        'email' => 'ali.khan@example.com',
    ]);

    $response = $this->postJson("/api/v1/leads/{$lead->id}/convert")->assertCreated();

    $student = Student::findOrFail($response->json('data.id'));

    expect($student->student_code)->toMatch('/^STU-\d{4}-\d{5}$/')
        ->and($student->email)->toBe('ali.khan@example.com')
        ->and($student->assigned_counselor_id)->toBe($counselor->id)
        ->and($lead->fresh()->status)->toBe('converted')
        ->and($lead->fresh()->student_id)->toBe($student->id)
        ->and($student->activities()->where('type', 'system')->exists())->toBeTrue()
        ->and(Task::where('student_id', $student->id)->exists())->toBeTrue();
});

it('returns 409 when converting an already-converted lead', function () {
    $counselor = actingAsStaffWith(COUNSELOR_PERMS);
    $lead = Lead::factory()->assigned()->create(['assigned_user_id' => $counselor->id]);

    $this->postJson("/api/v1/leads/{$lead->id}/convert")->assertCreated();
    $this->postJson("/api/v1/leads/{$lead->id}/convert")
        ->assertStatus(409)
        ->assertJsonPath('code', 'CONFLICT');
});

it('blocks converting a lead assigned to someone else', function () {
    actingAsStaffWith(COUNSELOR_PERMS);
    $other = User::factory()->create();
    $lead = Lead::factory()->assigned()->create(['assigned_user_id' => $other->id]);

    $this->postJson("/api/v1/leads/{$lead->id}/convert")->assertStatus(403);
});

it('lets counselors update their own leads but not others', function () {
    $counselor = actingAsStaffWith(COUNSELOR_PERMS);
    $mine = Lead::factory()->assigned()->create(['assigned_user_id' => $counselor->id]);
    $other = Lead::factory()->create();

    $this->patchJson("/api/v1/leads/{$mine->id}", ['status' => 'contacted'])
        ->assertOk()
        ->assertJsonPath('data.status', 'contacted');

    $this->patchJson("/api/v1/leads/{$other->id}", ['status' => 'contacted'])
        ->assertStatus(403);
});
