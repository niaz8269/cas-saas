<?php

use App\Models\Communication;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('files a student message on their timeline and notifies the assigned counselor', function () {
    $counselor = User::factory()->create();
    $student = actingAsStudentPortal(['assigned_counselor_id' => $counselor->id]);

    $this->postJson('/api/v1/student/messages', ['body' => 'When will my offer letter arrive?'])
        ->assertCreated();

    $message = Communication::where('student_id', $student->id)->sole();
    expect($message->direction)->toBe('in')
        ->and($message->channel)->toBe('in_app')
        ->and($message->body)->toBe('When will my offer letter arrive?');

    expect(Notification::where('user_id', $counselor->id)->where('entity_type', 'student')->where('entity_id', $student->id)->exists())->toBeTrue();
});

it('rings the Counselor and Admissions teams when no counselor is assigned', function () {
    Role::findOrCreate('Admissions', 'staff');
    $officer = User::factory()->create();
    $officer->assignRole('Admissions');
    actingAsStudentPortal(['assigned_counselor_id' => null]);

    $this->postJson('/api/v1/student/messages', ['body' => 'I need help with my documents.'])->assertCreated();

    expect(Notification::where('user_id', $officer->id)->where('type', 'student_message')->exists())->toBeTrue();
});

it('rejects an empty or oversized message', function () {
    actingAsStudentPortal();

    $this->postJson('/api/v1/student/messages', ['body' => ''])->assertStatus(422);
    $this->postJson('/api/v1/student/messages', ['body' => str_repeat('a', 2001)])->assertStatus(422);
});

it('does not let a signed-out visitor send a message', function () {
    $this->postJson('/api/v1/student/messages', ['body' => 'Hello there team'])->assertUnauthorized();
});
