<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\AutomationRule;
use App\Models\Country;
use App\Models\DocumentType;
use App\Models\Intake;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Notification;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use App\Models\UniversityAgreement;
use App\Services\Comms\Templates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

// Routes the rest of the suite never calls: portal reference data and
// notification feeds, student auth edges, catalog detail routes, exports.

// ── Agent portal ────────────────────────────────────────────────────────

it('gives agents the nationality list and funding options', function () {
    actingAsAgent();
    Country::factory()->create(['name' => 'Pakistan', 'iso2' => 'PK']);

    $this->getJson('/api/v1/agent/countries')->assertOk()->assertJsonPath('data.0.name', 'Pakistan');
    $this->getJson('/api/v1/agent/applications/funding-options?degree=mbbs')->assertOk()->assertJsonStructure(['data']);
    $this->getJson('/api/v1/agent/applications/funding-options?degree=nonsense')->assertStatus(422);
    $this->getJson('/api/v1/agent/applications/funding-options')->assertStatus(422);
});

it('resolves the required documents for a program for an agent', function () {
    actingAsAgent();
    $program = Program::factory()->create();

    $this->getJson("/api/v1/agent/applications/required-documents?program_id={$program->id}")
        ->assertOk()->assertJsonStructure(['data']);
    $this->getJson('/api/v1/agent/applications/required-documents?program_id=999999')->assertStatus(422);
});

it('presigns a document upload only on the agents own draft', function () {
    $agent = actingAsAgent();
    $type = DocumentType::firstOrCreate(['name' => 'Passport'], ['category' => 'identity']);
    $body = ['document_type_id' => $type->id, 'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000];

    $mine = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'draft']);
    $theirs = Application::factory()->create(['agent_id' => Agent::factory()->create()->id, 'status' => 'draft']);
    $submitted = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'under_review']);

    $this->postJson("/api/v1/agent/applications/{$mine->id}/documents/presign", $body)
        ->assertOk()->assertJsonStructure(['key', 'url', 'expires_at']);
    $this->postJson("/api/v1/agent/applications/{$theirs->id}/documents/presign", $body)->assertNotFound();
    $this->postJson("/api/v1/agent/applications/{$submitted->id}/documents/presign", $body)->assertStatus(409);
    $this->postJson("/api/v1/agent/applications/{$mine->id}/documents/presign", [...$body, 'mime' => 'text/html'])->assertStatus(422);
});

it('keeps an agents notification feed to the agent and lets them clear it', function () {
    $agent = actingAsAgent();
    Notification::factory()->count(2)->create(['user_id' => null, 'agent_id' => $agent->id]);
    Notification::factory()->create(['user_id' => null, 'agent_id' => Agent::factory()->create()->id]);

    $this->getJson('/api/v1/agent/notifications/unread-count')->assertOk()->assertJsonPath('unread', 2);
    $this->getJson('/api/v1/agent/notifications')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.unread', 2);

    $first = Notification::where('agent_id', $agent->id)->first();
    $this->postJson("/api/v1/agent/notifications/{$first->id}/read")->assertOk();
    $this->getJson('/api/v1/agent/notifications/unread-count')->assertJsonPath('unread', 1);

    $this->postJson('/api/v1/agent/notifications/read-all')->assertOk()->assertJsonPath('unread', 0);

    $other = Notification::whereNotNull('agent_id')->where('agent_id', '!=', $agent->id)->first();
    $this->postJson("/api/v1/agent/notifications/{$other->id}/read")->assertNotFound();
});

// ── Student portal ──────────────────────────────────────────────────────

it('keeps a students notification feed to the student', function () {
    $student = actingAsStudentPortal();
    $mine = Notification::factory()->create(['user_id' => null, 'student_id' => $student->id]);
    $theirs = Notification::factory()->create(['user_id' => null, 'student_id' => Student::factory()->create()->id]);

    $this->getJson('/api/v1/student/notifications/unread-count')->assertOk()->assertJsonPath('unread', 1);
    $this->postJson("/api/v1/student/notifications/{$mine->id}/read")->assertOk();
    $this->getJson('/api/v1/student/notifications/unread-count')->assertJsonPath('unread', 0);
    $this->postJson("/api/v1/student/notifications/{$theirs->id}/read")->assertNotFound();
});

it('presigns a document upload on the students own draft only', function () {
    $student = actingAsStudentPortal();
    $type = DocumentType::firstOrCreate(['name' => 'Passport'], ['category' => 'identity']);
    $body = ['document_type_id' => $type->id, 'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000];

    $mine = Application::factory()->create(['student_id' => $student->id, 'agent_id' => null, 'status' => 'draft']);
    $theirs = Application::factory()->create(['agent_id' => null, 'status' => 'draft']);

    $this->postJson("/api/v1/student/applications/{$mine->id}/documents/presign", $body)
        ->assertOk()->assertJsonStructure(['key', 'url']);
    $this->postJson("/api/v1/student/applications/{$theirs->id}/documents/presign", $body)->assertNotFound();
});

it('logs a student out by revoking the token', function () {
    $student = Student::factory()->create(['password' => 'secret-pass-1']);
    $token = $student->createToken('t')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/student/auth/logout')->assertOk();
    expect($student->tokens()->count())->toBe(0);
});

it('verifies a students email only from a valid signed link', function () {
    $student = Student::factory()->create(['email_verified_at' => null]);

    $url = URL::temporarySignedRoute('student.verify', now()->addHour(), [
        'id' => $student->id, 'hash' => $student->verificationHash(),
    ]);

    $this->get($url)->assertOk()->assertSee('Email verified');
    expect($student->refresh()->hasVerifiedEmail())->toBeTrue();

    // A wrong hash is refused even with a valid signature; an unsigned link never gets in.
    $other = Student::factory()->create(['email_verified_at' => null]);
    $bad = URL::temporarySignedRoute('student.verify', now()->addHour(), ['id' => $other->id, 'hash' => 'nope']);
    $this->get($bad)->assertForbidden();
    $this->get("/api/v1/student/auth/verify/{$other->id}/{$other->verificationHash()}")->assertForbidden();
    expect($other->refresh()->hasVerifiedEmail())->toBeFalse();
});

// ── Public site ─────────────────────────────────────────────────────────

it('lists countries for the public sign-up forms', function () {
    Country::factory()->create(['name' => 'Nepal', 'iso2' => 'NP']);

    $this->getJson('/api/v1/public/countries')->assertOk()->assertJsonPath('data.0.name', 'Nepal');
});

it('serves a public city page and 404s an unknown one', function () {
    University::factory()->create(['city' => 'Xian', 'status' => 'active']);

    $this->getJson('/api/v1/public/cities/xian')->assertOk()->assertJsonPath('city', 'Xian');
    $this->getJson('/api/v1/public/cities/atlantis')->assertNotFound();
});

// ── Staff: catalog detail routes ────────────────────────────────────────

it('shows, updates and deletes an intake for a catalog manager only', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $intake = Intake::factory()->create(['status' => 'open']);

    $this->getJson("/api/v1/intakes/{$intake->id}")->assertOk()->assertJsonPath('data.id', $intake->id);
    $this->patchJson("/api/v1/intakes/{$intake->id}", ['status' => 'closed'])->assertOk()->assertJsonPath('data.status', 'closed');
    $this->deleteJson("/api/v1/intakes/{$intake->id}")->assertNoContent();
    expect(Intake::count())->toBe(0);
});

it('lets a view-only user read but not change an intake', function () {
    actingAsStaffWith(['universities.view.global']);
    $intake = Intake::factory()->create();

    $this->getJson("/api/v1/intakes/{$intake->id}")->assertOk();
    $this->patchJson("/api/v1/intakes/{$intake->id}", ['status' => 'closed'])->assertForbidden();
    $this->deleteJson("/api/v1/intakes/{$intake->id}")->assertForbidden();
});

it('shows, updates and deletes a university agreement for a catalog manager only', function () {
    actingAsStaffWith(['commission.view.global', 'universities.manage.global']);
    $agreement = UniversityAgreement::factory()->create();

    $this->getJson("/api/v1/agreements/{$agreement->id}")->assertOk();
    $this->patchJson("/api/v1/agreements/{$agreement->id}", ['notes' => 'renewed'])->assertOk();
    $this->deleteJson("/api/v1/agreements/{$agreement->id}")->assertSuccessful();
    expect(UniversityAgreement::count())->toBe(0);
});

it('hides an agreement from a user with no commission or catalog access', function () {
    actingAsStaffWith(['universities.view.global']);
    $agreement = UniversityAgreement::factory()->create();

    $this->getJson("/api/v1/agreements/{$agreement->id}")->assertForbidden();
    $this->deleteJson("/api/v1/agreements/{$agreement->id}")->assertForbidden();
});

// ── Staff: settings, exports ────────────────────────────────────────────

it('lists automation rules for settings admins only', function () {
    AutomationRule::factory()->create(['name' => 'Escalate overdue']);

    actingAsStaffWith(['dashboard.view.global']);
    $this->getJson('/api/v1/automation-rules')->assertForbidden();

    actingAsStaffWith(['settings.manage.global']);
    $this->getJson('/api/v1/automation-rules')->assertOk()->assertJsonFragment(['name' => 'Escalate overdue']);
});

it('sends a template test to the log channel and validates the channel', function () {
    $admin = actingAsStaffWith(['settings.manage.global']);

    $this->postJson('/api/v1/message-templates/nope/test', ['channel' => 'sms'])->assertNotFound();

    $key = array_key_first(Templates::TEMPLATES);
    $this->postJson("/api/v1/message-templates/{$key}/test", ['channel' => 'carrier-pigeon'])->assertStatus(422);
    $this->postJson("/api/v1/message-templates/{$key}/test", ['channel' => 'sms'])
        ->assertOk()->assertJsonPath('data.status', 'sent')->assertJsonPath('data.to', $admin->email);
});

it('emails a template test through the mail driver', function () {
    Mail::fake();
    actingAsStaffWith(['settings.manage.global']);
    $key = array_key_first(Templates::TEMPLATES);

    $this->postJson("/api/v1/message-templates/{$key}/test", ['channel' => 'email', 'to' => 'qa@example.com'])
        ->assertOk()->assertJsonPath('data.to', 'qa@example.com');
});

it('exports invoices and leads as CSV for those who may see them', function () {
    actingAsStaffWith(['finance.view.global', 'leads.view.global']);
    Invoice::factory()->create(['invoice_no' => 'INV-EXPORT-1']);
    Lead::factory()->create(['first_name' => 'Exportable']);

    $invoices = $this->get('/api/v1/invoices/export');
    $invoices->assertOk();
    expect($invoices->headers->get('content-type'))->toContain('text/csv')
        ->and($invoices->streamedContent())->toContain('INV-EXPORT-1');

    $leads = $this->get('/api/v1/leads/export');
    $leads->assertOk();
    expect($leads->streamedContent())->toContain('Exportable');
});

it('refuses exports to staff without access', function () {
    actingAsStaffWith(['commission.view.own']);

    $this->get('/api/v1/invoices/export')->assertForbidden();
    $this->get('/api/v1/leads/export')->assertForbidden();
});
