<?php

namespace App\Services\Admissions;

use App\Exceptions\ChecklistIncompleteException;
use App\Models\Activity;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\DocumentType;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Owns the application lifecycle (Technical Report §5.4): every state
 * change is guarded, transactional, and written to the immutable
 * application_status_history.
 */
class ApplicationWorkflow
{
    /** @var array<string, list<string>> */
    public const TRANSITIONS = [
        'draft' => ['under_review', 'withdrawn'],
        'under_review' => ['documents_pending', 'submitted', 'withdrawn'],
        'documents_pending' => ['under_review', 'submitted', 'withdrawn'],
        'submitted' => ['offer_received', 'rejected', 'withdrawn'],
        'offer_received' => ['accepted', 'rejected', 'deferred', 'withdrawn'],
        'deferred' => ['under_review', 'withdrawn'],
        'accepted' => [],
        'rejected' => [],
        'withdrawn' => [],
    ];

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): Application
    {
        return DB::transaction(function () use ($data, $actor) {
            $application = Application::create([
                ...$data,
                'application_code' => $this->nextCode(),
                'status' => 'draft',
                'created_by' => $actor->id,
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'from_status' => null,
                'to_status' => 'draft',
                'changed_by' => $actor->id,
                'created_at' => now(),
            ]);

            $application->load(['university:id,name', 'course:id,name']);

            Activity::create([
                'student_id' => $application->student_id,
                'user_id' => $actor->id,
                'type' => 'system',
                'body' => "Application {$application->application_code} created — {$application->course->name} at {$application->university->name}",
                'meta' => ['application_id' => $application->id],
                'created_at' => now(),
            ]);

            return $application;
        });
    }

    public function transition(Application $application, string $to, User $actor, ?string $note = null): Application
    {
        $from = $application->status;
        $allowed = self::TRANSITIONS[$from] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw new ConflictHttpException("Illegal transition: {$from} → {$to}.");
        }

        if ($to === 'submitted') {
            $missing = $this->missingChecklist($application);

            if ($missing->isNotEmpty()) {
                throw new ChecklistIncompleteException($missing->values()->all());
            }
        }

        return DB::transaction(function () use ($application, $from, $to, $actor, $note) {
            $application->forceFill([
                'status' => $to,
                'updated_by' => $actor->id,
                ...($to === 'submitted' ? ['submitted_at' => now()] : []),
            ])->save();

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => $actor->id,
                'note' => $note,
                'created_at' => now(),
            ]);

            if (in_array($to, ['submitted', 'offer_received', 'accepted', 'rejected'], true)) {
                Activity::create([
                    'student_id' => $application->student_id,
                    'user_id' => $actor->id,
                    'type' => 'status',
                    'body' => "Application {$application->application_code}: {$from} → {$to}",
                    'meta' => ['application_id' => $application->id],
                    'created_at' => now(),
                ]);
            }

            if ($to === 'accepted') {
                // TODO(M5): create the student invoice and the expected
                // commission from the matching university agreement.
            }

            return $application->refresh();
        });
    }

    /**
     * Required-for-application document types not yet covered by a
     * non-rejected document on this application.
     *
     * @return Collection<int, string>
     */
    public function missingChecklist(Application $application): Collection
    {
        $required = DocumentType::requiredFor('application')->pluck('name', 'id');

        if ($required->isEmpty()) {
            return collect();
        }

        $coveredTypeIds = $application->documents()
            ->where('status', '!=', 'rejected')
            ->pluck('document_type_id')
            ->filter()
            ->unique();

        return $required
            ->reject(fn ($name, $id) => $coveredTypeIds->contains($id))
            ->values();
    }

    private function nextCode(): string
    {
        $year = now()->year;
        $sequence = Application::withTrashed()->count() + 1;

        do {
            $code = sprintf('APP-%d-%05d', $year, $sequence);
            $sequence++;
        } while (Application::withTrashed()->where('application_code', $code)->exists());

        return $code;
    }
}
