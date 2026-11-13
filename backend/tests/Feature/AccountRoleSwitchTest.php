<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('switches a student to a partner, keeping the password and linking both records', function () {
    actingAsStaffWith(['agents.manage.global']);
    $student = Student::factory()->create(['first_name' => 'Ali', 'last_name' => 'Raza', 'email' => 'ali@example.com', 'phone' => '+92300']);
    $student->forceFill(['password' => 'Secret#12345'])->save();
    $hash = $student->fresh()->getRawOriginal('password');
    $student->createToken('portal');

    $response = $this->postJson("/api/v1/students/{$student->id}/convert-to-partner")->assertOk()->assertJsonPath('data.role', 'partner');

    $agent = Agent::findOrFail($response->json('data.id'));
    expect($agent->name)->toBe('Ali Raza')
        ->and($agent->email)->toBe('ali@example.com')
        ->and($agent->status)->toBe('active')
        ->and($agent->getRawOriginal('password'))->toBe($hash)
        ->and($agent->converted_student_id)->toBe($student->id);

    $student->refresh();
    expect($student->status)->toBe('converted')
        ->and($student->getRawOriginal('password'))->toBeNull()
        ->and($student->converted_agent_id)->toBe($agent->id)
        ->and($student->tokens()->count())->toBe(0);
    expect(AuditLog::where('action', 'role_switched')->where('auditable_id', $student->id)->exists())->toBeTrue();
});

it('lets the switched person sign in to the partner portal with the same password', function () {
    actingAsStaffWith(['agents.manage.global']);
    $student = Student::factory()->create(['email' => 'sam@example.com']);
    $student->forceFill(['password' => 'Secret#12345'])->save();

    $this->postJson("/api/v1/students/{$student->id}/convert-to-partner")->assertOk();

    expect(Agent::where('email', 'sam@example.com')->first()->status)->toBe('active')
        ->and(Hash::check('Secret#12345', Agent::where('email', 'sam@example.com')->first()->password))->toBeTrue();
});

it('will not switch a student who has applications, has no email, or is already switched', function () {
    actingAsStaffWith(['agents.manage.global']);

    $withApp = Student::factory()->create(['email' => 'a@example.com']);
    Application::factory()->create(['student_id' => $withApp->id]);
    $this->postJson("/api/v1/students/{$withApp->id}/convert-to-partner")->assertStatus(422)->assertJsonValidationErrors('account');

    $noEmail = Student::factory()->create(['email' => null]);
    $this->postJson("/api/v1/students/{$noEmail->id}/convert-to-partner")->assertStatus(422);

    $done = Student::factory()->create(['email' => 'done@example.com', 'status' => 'converted']);
    $this->postJson("/api/v1/students/{$done->id}/convert-to-partner")->assertStatus(422);

    expect(Agent::count())->toBe(0);
});

it('switches a partner with no records back to a student', function () {
    actingAsStaffWith(['agents.manage.global']);
    $agent = Agent::factory()->create(['name' => 'Bright Co', 'contact_name' => 'Sara Khan', 'email' => 'sara@example.com', 'status' => 'active']);
    $agent->forceFill(['password' => 'Secret#12345'])->save();
    $agent->createToken('portal');

    $response = $this->postJson("/api/v1/agents/{$agent->id}/convert-to-student")->assertOk()->assertJsonPath('data.role', 'student');

    $student = Student::findOrFail($response->json('data.id'));
    expect($student->first_name)->toBe('Sara')->and($student->last_name)->toBe('Khan')
        ->and($student->email)->toBe('sara@example.com');
    $agent->refresh();
    expect($agent->status)->toBe('converted')
        ->and($agent->getRawOriginal('password'))->toBeNull()
        ->and($agent->tokens()->count())->toBe(0);
});

it('refuses to switch a partner who still has students, sub-agents or applications, and says why', function () {
    actingAsStaffWith(['agents.manage.global']);
    $agent = Agent::factory()->create(['email' => 'p@example.com', 'status' => 'active']);
    Student::factory()->create(['agent_id' => $agent->id]);
    Agent::factory()->create(['parent_agent_id' => $agent->id]);

    $this->postJson("/api/v1/agents/{$agent->id}/convert-to-student")
        ->assertStatus(422)
        ->assertJsonPath('errors.account.0', fn ($m) => str_contains($m, 'sub-agents') && str_contains($m, 'referred students'));

    expect($agent->fresh()->status)->toBe('active');
});

it('needs the manage permission', function () {
    actingAsStaffWith(['agents.view.global']);
    $student = Student::factory()->create(['email' => 'x@example.com']);
    $agent = Agent::factory()->create(['email' => 'y@example.com']);

    $this->postJson("/api/v1/students/{$student->id}/convert-to-partner")->assertForbidden();
    $this->postJson("/api/v1/agents/{$agent->id}/convert-to-student")->assertForbidden();
});
