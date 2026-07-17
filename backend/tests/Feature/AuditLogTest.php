<?php

use App\Models\AuditLog;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('records a create with the new values and the acting user', function () {
    $actor = actingAsStaffWith([]);

    $student = Student::factory()->create(['first_name' => 'Ali', 'status' => 'active']);

    $log = AuditLog::where('auditable_type', Student::class)->where('action', 'create')->first();

    expect($log)->not->toBeNull()
        ->and($log->auditable_id)->toBe($student->id)
        ->and($log->user_id)->toBe($actor->id)
        ->and($log->new_values['first_name'])->toBe('Ali')
        ->and($log->old_values)->toBeNull();
});

it('records an update with only the changed fields (before + after)', function () {
    actingAsStaffWith([]);
    $student = Student::factory()->create(['status' => 'active']);
    AuditLog::query()->delete(); // ignore the create entry

    $student->update(['status' => 'arrived']);

    $log = AuditLog::where('action', 'update')->first();

    expect($log->old_values)->toBe(['status' => 'active'])
        ->and($log->new_values)->toBe(['status' => 'arrived']);
});

it('records a delete', function () {
    actingAsStaffWith([]);
    $student = Student::factory()->create();
    AuditLog::query()->delete();

    $student->delete();

    expect(AuditLog::where('action', 'delete')->where('auditable_id', $student->id)->exists())->toBeTrue();
});

it('never captures sensitive fields like the password', function () {
    actingAsStaffWith([]);

    $user = User::factory()->create(['name' => 'New Admin']);

    $log = AuditLog::where('auditable_type', User::class)->where('action', 'create')->first();

    expect($log->new_values)->toHaveKey('name')
        ->and($log->new_values)->not->toHaveKey('password')
        ->and($log->new_values)->not->toHaveKey('remember_token');
});

it('records no actor for a system (unauthenticated) change', function () {
    $student = Student::factory()->create(); // no acting user

    $log = AuditLog::where('auditable_id', $student->id)->first();

    expect($log->user_id)->toBeNull();
});

it('exposes the audit trail to admins, filterable by entity', function () {
    $admin = actingAsStaffWith(['users.manage.global']);
    $student = Student::factory()->create();
    $student->update(['status' => 'arrived']);

    $this->getJson("/api/v1/audit-logs?filter[entity]=student&filter[entity_id]={$student->id}")
        ->assertOk()
        ->assertJsonPath('data.0.entity_type', 'Student')
        ->assertJsonPath('data.0.actor', $admin->name);
});

it('denies the audit trail without users.manage', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/audit-logs')->assertForbidden();
});
