<?php

use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentAgreement;
use App\Models\Lead;
use App\Models\Student;
use App\Models\StudentGuardian;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every CRM table from schema.sql', function () {
    foreach ([
        'agents', 'agent_agreements', 'marketing_sources', 'campaigns',
        'website_sources', 'students', 'student_guardians', 'leads',
        'activities', 'tasks',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('shapes leads for ingestion, attribution and dedup linkage', function () {
    expect(Schema::hasColumns('leads', [
        'first_name', 'last_name', 'email', 'phone', 'passport_no',
        'website_source_id', 'marketing_source_id', 'campaign_id', 'agent_id',
        'assigned_user_id', 'intake_route', 'status', 'student_id',
        'duplicate_of', 'message', 'meta', 'deleted_at',
    ]))->toBeTrue();
});

it('builds the agent hierarchy with share agreements', function () {
    $partner = Agent::factory()->create();
    $sub = Agent::factory()->subAgentOf($partner)->create();
    $subSub = Agent::factory()->subAgentOf($sub)->create();
    AgentAgreement::factory()->for($partner)->create(['share_value' => 50]);

    expect($sub->parent->id)->toBe($partner->id)
        ->and($subSub->type)->toBe('sub_sub')
        ->and($partner->children)->toHaveCount(1)
        ->and($partner->agreements()->first()->share_value)->toBe('50.00');
});

it('keeps one permanent student identity with timeline and guardians', function () {
    $student = Student::factory()
        ->has(StudentGuardian::factory(), 'guardians')
        ->has(Activity::factory()->count(3), 'activities')
        ->create();

    $lead = Lead::factory()->create(['student_id' => $student->id, 'status' => 'converted']);
    Task::factory()->for($student)->create();

    expect($student->guardians)->toHaveCount(1)
        ->and($student->activities)->toHaveCount(3)
        ->and($student->leads->first()->id)->toBe($lead->id)
        ->and($student->tasks)->toHaveCount(1)
        ->and($student->full_name)->not->toBe('');
});

it('marks duplicate leads pointing at the original', function () {
    $original = Lead::factory()->create();
    $duplicate = Lead::factory()->create(['duplicate_of' => $original->id, 'status' => 'duplicate']);

    expect($duplicate->duplicateOf->id)->toBe($original->id);
});
