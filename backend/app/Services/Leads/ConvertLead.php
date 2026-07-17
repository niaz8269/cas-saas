<?php

namespace App\Services\Leads;

use App\Models\Activity;
use App\Models\Lead;
use App\Models\Student;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Lead → Student conversion (Technical Report §5.2). One transaction:
 * permanent student identity, lead marked converted, system timeline
 * entry, follow-up task for the counselor.
 */
class ConvertLead
{
    /**
     * @param  array{branch_id?: int|null}  $options
     */
    public function handle(Lead $lead, User $actor, array $options = []): Student
    {
        if ($lead->status === 'converted' || $lead->student_id !== null) {
            throw new ConflictHttpException('Lead is already converted.');
        }

        if ($lead->status === 'duplicate') {
            throw new ConflictHttpException('Duplicate leads cannot be converted — work the original record.');
        }

        return DB::transaction(function () use ($lead, $actor, $options) {
            $student = Student::create([
                'student_code' => $this->nextStudentCode(),
                'first_name' => $lead->first_name ?? 'Unknown',
                'last_name' => $lead->last_name ?? '',
                'email' => $lead->email,
                'phone' => $lead->phone,
                'passport_no' => $lead->passport_no,
                'country_id' => $lead->country_id,
                'branch_id' => $options['branch_id'] ?? $actor->branch_id,
                'agent_id' => $lead->agent_id,
                'assigned_counselor_id' => $lead->assigned_user_id ?? $actor->id,
                'status' => 'active',
                'created_by' => $actor->id,
            ]);

            $lead->update([
                'status' => 'converted',
                'student_id' => $student->id,
            ]);

            Activity::create([
                'student_id' => $student->id,
                'user_id' => $actor->id,
                'type' => 'system',
                'body' => "Converted from lead #{$lead->id}",
                'meta' => ['lead_id' => $lead->id],
                'created_at' => now(),
            ]);

            Task::create([
                'title' => "Qualify programs for {$student->full_name}",
                'assignee_id' => $student->assigned_counselor_id,
                'student_id' => $student->id,
                'related_type' => Lead::class,
                'related_id' => $lead->id,
                'due_at' => now()->addHours(72),
                'priority' => 'normal',
                'status' => 'open',
                'created_by' => $actor->id,
            ]);

            return $student;
        });
    }

    /**
     * STU-{year}-{5-digit sequence}; retries on the (rare) collision.
     */
    private function nextStudentCode(): string
    {
        $year = now()->year;
        $sequence = Student::withTrashed()->count() + 1;

        do {
            $code = sprintf('STU-%d-%05d', $year, $sequence);
            $sequence++;
        } while (Student::withTrashed()->where('student_code', $code)->exists());

        return $code;
    }
}
