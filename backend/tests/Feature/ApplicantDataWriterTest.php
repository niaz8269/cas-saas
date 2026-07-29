<?php

use App\Models\Student;
use App\Models\StudentEducation;
use App\Models\StudentGuardian;
use App\Services\Admissions\ApplicantDataWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * The applicant record is captured in more than one place now (the partner's
 * add-student form and the apply wizards), so "not supplied" must never be
 * read as "delete what is there".
 */
it('keeps existing guardians and education when the payload omits them', function () {
    $student = Student::factory()->create();
    StudentGuardian::create(['student_id' => $student->id, 'relation' => 'father', 'name' => 'Kamran']);
    StudentEducation::create(['student_id' => $student->id, 'degree_name' => 'FSc']);

    app(ApplicantDataWriter::class)->write($student, ['profile' => ['city' => 'Lahore']]);

    expect($student->fresh()->city)->toBe('Lahore')
        ->and($student->guardians()->count())->toBe(1)
        ->and($student->education()->count())->toBe(1);
});

it('keeps them when the payload sends empty collections', function () {
    $student = Student::factory()->create();
    StudentGuardian::create(['student_id' => $student->id, 'relation' => 'father', 'name' => 'Kamran']);
    StudentEducation::create(['student_id' => $student->id, 'degree_name' => 'FSc']);

    app(ApplicantDataWriter::class)->write($student, ['guardians' => [], 'education' => []]);

    expect($student->guardians()->count())->toBe(1)
        ->and($student->education()->count())->toBe(1);
});

it('replaces them when the payload actually supplies them', function () {
    $student = Student::factory()->create();
    StudentGuardian::create(['student_id' => $student->id, 'relation' => 'father', 'name' => 'Kamran']);

    app(ApplicantDataWriter::class)->write($student, [
        'guardians' => [['relation' => 'mother', 'name' => 'Sadia']],
    ]);

    $guardians = $student->guardians()->get();

    expect($guardians)->toHaveCount(1)
        ->and($guardians->first()->name)->toBe('Sadia');
});

it('leaves the student untouched when no profile is supplied', function () {
    $student = Student::factory()->create(['city' => 'Karachi']);

    app(ApplicantDataWriter::class)->write($student, []);

    expect($student->fresh()->city)->toBe('Karachi');
});
