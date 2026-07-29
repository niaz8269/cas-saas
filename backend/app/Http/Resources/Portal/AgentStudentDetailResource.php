<?php

namespace App\Http\Resources\Portal;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One of the agent's own students, with the full applicant record they
 * submitted — the shape the apply wizard prefills from, so a partner never
 * re-types a fact they have already given CAS.
 *
 * Deliberately excludes what {@see AgentStudentResource} also withholds:
 * counselor assignment, branch, and audit columns stay internal.
 *
 * @mixin Student
 */
class AgentStudentDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_code' => $this->student_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'status' => $this->status,

            // Keyed exactly like the wizard's `profile` bag so it round-trips.
            'profile' => [
                'chinese_name' => $this->chinese_name,
                'native_language' => $this->native_language,
                'alternate_email' => $this->alternate_email,
                'wechat_id' => $this->wechat_id,
                'skype_id' => $this->skype_id,
                'phone' => $this->phone,
                'passport_no' => $this->passport_no,
                'passport_issue_date' => $this->passport_issue_date?->toDateString(),
                'passport_expiry_date' => $this->passport_expiry_date?->toDateString(),
                'dob' => $this->dob?->toDateString(),
                'place_of_birth' => $this->place_of_birth,
                'gender' => $this->gender,
                'marital_status' => $this->marital_status,
                'religion' => $this->religion,
                'english_test' => $this->english_test,
                'english_test_score' => $this->english_test_score,
                'english_test_date' => $this->english_test_date?->toDateString(),
                'permanent_address' => $this->permanent_address,
                'current_address' => $this->current_address,
                'city' => $this->city,
                'postal_code' => $this->postal_code,
                'country_id' => $this->country_id,
            ],

            'guardians' => $this->whenLoaded('guardians', fn () => $this->guardians->map(fn ($g) => [
                'relation' => $g->relation,
                'name' => $g->name,
                'occupation' => $g->occupation,
                'phone' => $g->phone,
                'email' => $g->email,
                'address' => $g->address,
            ])->all()),

            'education' => $this->whenLoaded('education', fn () => $this->education->map(fn ($e) => [
                'level' => $e->level,
                'degree_name' => $e->degree_name,
                'institution' => $e->institution,
                'board_or_university' => $e->board_or_university,
                'country_id' => $e->country_id,
                'major' => $e->major,
                'start_year' => $e->start_year,
                'end_year' => $e->end_year,
                'grade_type' => $e->grade_type,
                'grade_value' => $e->grade_value,
                'is_completed' => (bool) $e->is_completed,
            ])->all()),
        ];
    }
}
