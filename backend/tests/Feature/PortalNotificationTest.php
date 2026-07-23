<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\Document;
use App\Models\Notification;
use App\Models\Student;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The student & agent portals now have a durable in-app notification feed
 * (ADR-0012). Lifecycle milestones fan out to the student and the filing
 * agent; every feed query is scoped to the caller's own notifications.
 */

function portalNotif(array $attrs): Notification
{
    return Notification::create([
        'type' => 'x', 'title' => 'Update', 'channels' => ['in_app'], 'created_at' => now(),
        ...$attrs,
    ]);
}

it('notifies the student and the filing agent of an application milestone', function () {
    $agent = Agent::factory()->create();
    $application = Application::factory()->create(['status' => 'submitted', 'agent_id' => $agent->id]);

    app(ApplicationWorkflow::class)->transition($application, 'offer_received', User::factory()->create());

    expect(Notification::where('student_id', $application->student_id)->where('type', 'application.offer_received')->exists())->toBeTrue()
        ->and(Notification::where('agent_id', $agent->id)->where('type', 'application.offer_received')->exists())->toBeTrue();
});

it('notifies the student in-app when a document is rejected', function () {
    actingAsStaffWith(['documents.view.global', 'documents.verify.global']);
    $document = Document::factory()->create(); // Application-attached → has a student
    $studentId = Application::find($document->documentable_id)->student_id;

    $this->postJson("/api/v1/documents/{$document->id}/reject")->assertOk();

    expect(Notification::where('student_id', $studentId)->where('type', 'document.rejected')->exists())->toBeTrue();
});

it('lists a student only their own notifications with an unread count', function () {
    $student = actingAsStudentPortal();
    portalNotif(['student_id' => $student->id]);
    portalNotif(['student_id' => Student::factory()->create()->id]); // another student's — must not leak

    $res = $this->getJson('/api/v1/student/notifications')->assertOk();

    expect($res->json('data'))->toHaveCount(1)
        ->and($res->json('meta.unread'))->toBe(1);
});

it('lets an agent read their own notification but not a student\'s', function () {
    $agent = actingAsAgent();
    $own = portalNotif(['agent_id' => $agent->id]);
    $foreign = portalNotif(['student_id' => Student::factory()->create()->id]);

    $this->postJson("/api/v1/agent/notifications/{$own->id}/read")->assertOk();
    expect($own->fresh()->read_at)->not->toBeNull();

    $this->postJson("/api/v1/agent/notifications/{$foreign->id}/read")->assertNotFound();
});

it('clears all of a student\'s unread notifications', function () {
    $student = actingAsStudentPortal();
    portalNotif(['student_id' => $student->id]);
    portalNotif(['student_id' => $student->id]);

    $this->postJson('/api/v1/student/notifications/read-all')->assertOk()->assertJsonPath('unread', 0);

    expect(Notification::where('student_id', $student->id)->whereNull('read_at')->count())->toBe(0);
});
