<?php

namespace App\Services\Accounts;

use App\Models\Agent;
use App\Models\AgentAgreement;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moves a person between the Student and Partner (agent) portals. The old record is kept, deactivated and
 * linked to the new one; the password hash is carried over so they sign in with the same details.
 * Refuses (422 with a plain reason) when moving would orphan records that belong to the old role.
 */
class AccountRoleSwitcher
{
    public function studentToPartner(Student $student, Request $request): Agent
    {
        $this->guard($student->status === 'converted', 'This student has already been switched to a partner.');
        $this->guard(blank($student->email), 'This student has no email address, which a partner account needs.');
        $this->guard(
            Agent::where('email', $student->email)->where('status', '!=', 'converted')->exists(),
            'A partner account with this email already exists.',
        );
        $this->guard(
            Application::where('student_id', $student->id)->exists(),
            'This student already has applications. They stay with the student record, so it cannot be switched.',
        );

        return DB::transaction(function () use ($student, $request) {
            $name = trim($student->first_name.' '.$student->last_name);
            $agent = new Agent([
                'agent_code' => Agent::nextCode(),
                'name' => $name,
                'contact_name' => $name,
                'type' => 'partner',
                'email' => $student->email,
                'phone' => $student->phone,
                'country_id' => $student->country_id,
                'status' => 'active',
            ]);
            $agent->forceFill([
                'password' => $student->password,
                'converted_student_id' => $student->id,
                'converted_at' => now(),
            ])->save();

            $student->forceFill([
                'status' => 'converted',
                'converted_agent_id' => $agent->id,
                'converted_at' => now(),
                'password' => null,
            ])->save();
            $student->tokens()->delete();

            $this->audit($request, $student, ['role' => 'student'], ['role' => 'partner', 'agent_id' => $agent->id]);

            return $agent;
        });
    }

    public function partnerToStudent(Agent $agent, Request $request): Student
    {
        $this->guard($agent->status === 'converted', 'This partner has already been switched to a student.');
        $this->guard(blank($agent->email), 'This partner has no email address, which a student account needs.');
        $this->guard(
            Student::where('email', $agent->email)->where('status', '!=', 'converted')->exists(),
            'A student account with this email already exists.',
        );

        $blockers = [
            'sub-agents' => Agent::where('parent_agent_id', $agent->id)->exists(),
            'referred students' => Student::where('agent_id', $agent->id)->exists(),
            'leads' => Lead::where('agent_id', $agent->id)->exists(),
            'applications' => Application::where('agent_id', $agent->id)->exists(),
            'payables' => AgentPayable::where('agent_id', $agent->id)->exists(),
            'agreements' => AgentAgreement::where('agent_id', $agent->id)->exists(),
        ];
        $held = array_keys(array_filter($blockers));
        $this->guard($held !== [], 'This partner still has '.implode(', ', $held).'. Move or close those first, then switch the account.');

        return DB::transaction(function () use ($agent, $request) {
            $person = trim($agent->contact_name ?: $agent->name);
            [$first, $last] = array_pad(explode(' ', $person, 2), 2, '');

            $student = new Student([
                'student_code' => Student::nextCode(),
                'first_name' => $first,
                'last_name' => $last !== '' ? $last : $first,
                'email' => $agent->email,
                'phone' => $agent->phone,
                'country_id' => $agent->country_id,
                'status' => 'active',
            ]);
            $student->forceFill(['password' => $agent->password])->save();

            $agent->forceFill([
                'status' => 'converted',
                'converted_student_id' => $student->id,
                'converted_at' => now(),
                'password' => null,
            ])->save();
            $agent->tokens()->delete();

            $this->audit($request, $agent, ['role' => 'partner'], ['role' => 'student', 'student_id' => $student->id]);

            return $student;
        });
    }

    private function guard(bool $failed, string $message): void
    {
        if ($failed) {
            throw ValidationException::withMessages(['account' => [$message]]);
        }
    }

    /**
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     */
    private function audit(Request $request, Student|Agent $subject, array $old, array $new): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'role_switched',
            'auditable_type' => $subject->getMorphClass(),
            'auditable_id' => $subject->id,
            'old_values' => $old,
            'new_values' => $new,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }
}
