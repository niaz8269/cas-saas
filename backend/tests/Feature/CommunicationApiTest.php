<?php

use App\Jobs\SendCommunication;
use App\Models\Activity;
use App\Models\Communication;
use App\Models\MessageLog;
use App\Models\Student;
use App\Services\Comms\ChannelManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

const COMMS_VIEW = ['students.view.global'];

it('denies sending without student visibility', function () {
    actingAsStaffWith([]); // no students scope
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/communications", [
        'channel' => 'email', 'template' => 'welcome',
    ])->assertForbidden();
});

it('queues a rendered communication and dispatches the send job', function () {
    Queue::fake();
    actingAsStaffWith(COMMS_VIEW);
    $student = Student::factory()->create(['first_name' => 'Ali', 'email' => 'ali@example.com']);

    $this->postJson("/api/v1/students/{$student->id}/communications", [
        'channel' => 'email', 'template' => 'welcome',
    ])
        ->assertStatus(202)
        ->assertJsonPath('data.status', 'queued')
        ->assertJsonPath('data.channel', 'email');

    $communication = Communication::first();
    expect($communication->body)->toContain('Ali') // template rendered
        ->and($communication->template)->toBe('welcome');

    Queue::assertPushed(SendCommunication::class);
});

it('renders a custom body', function () {
    Queue::fake();
    actingAsStaffWith(COMMS_VIEW);
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/communications", [
        'channel' => 'whatsapp', 'template' => 'custom', 'body' => 'See you at orientation!',
    ])->assertStatus(202);

    expect(Communication::first()->body)->toBe('See you at orientation!');
});

it('requires a body for custom messages', function () {
    actingAsStaffWith(COMMS_VIEW);
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/communications", [
        'channel' => 'email', 'template' => 'custom',
    ])->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');
});

it('sends, logs the provider result, and mirrors to the student timeline', function () {
    Mail::fake();
    $student = Student::factory()->create(['email' => 'ali@example.com']);
    $communication = Communication::factory()->create([
        'student_id' => $student->id, 'channel' => 'email', 'status' => 'queued', 'body' => 'Hello',
    ]);

    (new SendCommunication($communication->id, 'Subject'))->handle(app(ChannelManager::class));

    expect($communication->refresh()->status)->toBe('sent')
        ->and(MessageLog::where('communication_id', $communication->id)->where('status', 'sent')->exists())->toBeTrue()
        ->and(Activity::where('student_id', $student->id)->where('type', 'email')->exists())->toBeTrue();
});

it('marks the send failed when the student has no email', function () {
    Mail::fake();
    $student = Student::factory()->create(['email' => null]);
    $communication = Communication::factory()->create([
        'student_id' => $student->id, 'channel' => 'email', 'status' => 'queued',
    ]);

    (new SendCommunication($communication->id))->handle(app(ChannelManager::class));

    expect($communication->refresh()->status)->toBe('failed')
        ->and(MessageLog::where('communication_id', $communication->id)->whereNotNull('error')->exists())->toBeTrue();

    Mail::assertNothingSent();
});

it('lists a students communications with provider logs, scoped', function () {
    $user = actingAsStaffWith(COMMS_VIEW);
    $student = Student::factory()->create();
    $comm = Communication::factory()->create(['student_id' => $student->id]);
    MessageLog::factory()->for($comm, 'communication')->create();
    Communication::factory()->create(); // another student's

    $this->getJson("/api/v1/students/{$student->id}/communications")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonCount(1, 'data.0.logs');
});
