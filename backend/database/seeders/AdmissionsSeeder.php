<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo admissions pipeline. Applications are progressed through the real
 * ApplicationWorkflow so history chains, checklist gates and timeline
 * entries are authentic. Document types idempotent by name; the random
 * pipeline seeds once.
 */
class AdmissionsSeeder extends Seeder
{
    private const DOCUMENT_TYPES = [
        // name, category, sensitive, required_for
        ['Passport', 'identity', true, ['application']],
        ['Passport Photo', 'identity', false, ['application']],
        ['Academic Transcript', 'academic', false, ['application']],
        ['School Leaving Certificate', 'academic', false, ['application']],
        ['Medical Examination Form', 'medical', false, null],
        ['Police Clearance Certificate', 'identity', true, null],
        ['Bank Statement', 'financial', true, null],
    ];

    public function run(): void
    {
        foreach (self::DOCUMENT_TYPES as [$name, $category, $sensitive, $requiredFor]) {
            DocumentType::firstOrCreate(['name' => $name], [
                'category' => $category,
                'is_sensitive' => $sensitive,
                'required_for' => $requiredFor,
            ]);
        }

        if (Application::exists()) {
            return; // pipeline already seeded
        }

        $workflow = app(ApplicationWorkflow::class);
        $admissions = User::where('email', 'admissions@cas.moe')->first();

        if (! $admissions || Student::count() === 0 || University::count() === 0) {
            return;
        }

        $students = Student::pluck('id');
        $universities = University::with(['courses:id,university_id', 'intakes:id,university_id'])->get();

        // target status => how many applications
        $ladder = [
            'draft' => 3,
            'under_review' => 3,
            'documents_pending' => 2,
            'submitted' => 3,
            'offer_received' => 2,
            'accepted' => 1,
            'rejected' => 1,
        ];

        $studentIndex = 0;

        foreach ($ladder as $target => $count) {
            for ($i = 0; $i < $count; $i++) {
                $university = $universities->random();
                $course = $university->courses->random();

                $application = $workflow->create([
                    'student_id' => $students[$studentIndex % $students->count()],
                    'university_id' => $university->id,
                    'course_id' => $course->id,
                    'intake_id' => $university->intakes->first()?->id,
                    'assigned_admissions_id' => $admissions->id,
                ], $admissions);

                $studentIndex++;

                $this->progress($workflow, $application, $target, $admissions);
            }
        }
    }

    private function progress(ApplicationWorkflow $workflow, Application $application, string $target, User $actor): void
    {
        $paths = [
            'draft' => [],
            'under_review' => ['under_review'],
            'documents_pending' => ['under_review', 'documents_pending'],
            'submitted' => ['under_review', 'submitted'],
            'offer_received' => ['under_review', 'submitted', 'offer_received'],
            'accepted' => ['under_review', 'submitted', 'offer_received', 'accepted'],
            'rejected' => ['under_review', 'submitted', 'rejected'],
        ];

        foreach ($paths[$target] as $step) {
            if ($step === 'submitted') {
                $this->attachRequiredDocuments($application, $actor);
            }

            if ($step === 'offer_received') {
                $application->offers()->create([
                    'offer_type' => fake()->randomElement(['conditional', 'unconditional']),
                    'reference_no' => strtoupper(fake()->bothify('OFR-2026-????')),
                    'issued_date' => now()->subDays(fake()->numberBetween(3, 20))->toDateString(),
                    'expiry_date' => now()->addDays(60)->toDateString(),
                ]);
            }

            $workflow->transition($application, $step, $actor, 'Seeded transition');
        }

        // A couple of pending docs on the documents_pending ones for realism.
        if ($target === 'documents_pending') {
            $this->attachDocument($application, 'Passport', 'pending', $actor);
        }
    }

    private function attachRequiredDocuments(Application $application, User $actor): void
    {
        $required = DocumentType::requiredFor('application')->get();

        foreach ($required as $type) {
            $this->attachDocument($application, $type->name, 'verified', $actor);
        }
    }

    private function attachDocument(Application $application, string $typeName, string $status, User $actor): void
    {
        $type = DocumentType::where('name', $typeName)->first();

        Document::create([
            'document_type_id' => $type?->id,
            'documentable_type' => Application::class,
            'documentable_id' => $application->id,
            'file_path' => "students/{$application->student_id}/applications/{$application->id}/".Str::uuid().'_seed.pdf',
            'file_name' => Str::slug($typeName).'.pdf',
            'mime' => 'application/pdf',
            'size' => fake()->numberBetween(100_000, 2_000_000),
            'status' => $status,
            'version' => 1,
            'verified_by' => $status === 'verified' ? $actor->id : null,
            'created_by' => $actor->id,
        ]);
    }
}
