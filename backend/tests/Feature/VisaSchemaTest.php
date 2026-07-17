<?php

use App\Models\VisaCase;
use App\Models\VisaChecklistItem;
use App\Models\VisaStatusHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every visa table from schema.sql', function () {
    foreach (['visa_cases', 'visa_checklist_items', 'visa_status_history'] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('links the visa graph: case, checklist, history, application, student', function () {
    $case = VisaCase::factory()->create();

    VisaChecklistItem::factory()->count(3)->for($case, 'visaCase')->create();
    VisaStatusHistory::create([
        'visa_case_id' => $case->id,
        'from_status' => null,
        'to_status' => 'not_started',
        'created_at' => now(),
    ]);

    expect($case->checklistItems)->toHaveCount(3)
        ->and($case->statusHistory)->toHaveCount(1)
        ->and($case->student->id)->toBe($case->application->student_id);
});
