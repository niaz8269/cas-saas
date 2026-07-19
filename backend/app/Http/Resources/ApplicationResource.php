<?php

namespace App\Http\Resources;

use App\Models\Application;
use App\Models\University;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_code' => $this->application_code,
            'kind' => $this->kind,
            'level' => $this->level,
            'preferences' => $this->applicationPreferences(),
            'review' => (bool) $this->review,
            'source' => $this->whenLoaded('source', fn () => $this->source ? [
                'id' => $this->source->id, 'name' => $this->source->name,
            ] : null),
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_code' => $this->student->student_code,
                'full_name' => $this->student->full_name,
            ]),
            // Full applicant profile — only present on the detail endpoint, which
            // loads the complete student row plus guardians and education.
            'applicant' => $this->when(
                (bool) $this->student?->relationLoaded('education'),
                fn () => $this->applicantProfile(),
            ),
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id, 'name' => $this->university->name, 'code' => $this->university->code,
            ]),
            'program' => $this->whenLoaded('program', fn () => [
                'id' => $this->program->id, 'name' => $this->program->name, 'level' => $this->program->level,
            ]),
            'intake' => $this->whenLoaded('intake', fn () => $this->intake ? [
                'id' => $this->intake->id, 'name' => $this->intake->name,
            ] : null),
            'scholarship' => $this->whenLoaded('scholarship', fn () => $this->scholarship ? [
                'id' => $this->scholarship->id, 'name' => $this->scholarship->name,
            ] : null),
            'admissions_officer' => $this->whenLoaded('admissionsOfficer', fn () => $this->admissionsOfficer ? [
                'id' => $this->admissionsOfficer->id, 'name' => $this->admissionsOfficer->name,
            ] : null),
            'offers' => OfferResource::collection($this->whenLoaded('offers')),
            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($entry) => [
                'from_status' => $entry->from_status,
                'to_status' => $entry->to_status,
                'note' => $entry->note,
                'changed_by' => $entry->changedBy?->name,
                'created_at' => $entry->created_at?->toIso8601String(),
            ])),
            'documents_count' => $this->whenCounted('documents'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * The full applicant profile assembled for the detail view: personal,
     * passport and contact details, plus guardians/contacts and education.
     *
     * @return array<string, mixed>
     */
    private function applicantProfile(): array
    {
        $s = $this->student;

        return [
            'personal' => [
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'chinese_name' => $s->chinese_name,
                'dob' => $s->dob?->format('Y-m-d'),
                'gender' => $s->gender,
                'marital_status' => $s->marital_status,
                'religion' => $s->religion,
                'nationality' => $s->country?->name,
                'native_language' => $s->native_language,
                'place_of_birth' => $s->place_of_birth,
                'city' => $s->city,
            ],
            'passport' => [
                'passport_no' => $s->passport_no,
                'issue_date' => $s->passport_issue_date?->format('Y-m-d'),
                'expiry_date' => $s->passport_expiry_date?->format('Y-m-d'),
            ],
            'contact' => [
                'email' => $s->email,
                'alternate_email' => $s->alternate_email,
                'phone' => $s->phone,
                'wechat_id' => $s->wechat_id,
                'skype_id' => $s->skype_id,
                'current_address' => $s->current_address,
                'permanent_address' => $s->permanent_address,
            ],
            'guardians' => $s->guardians->map(fn ($g) => [
                'name' => $g->name,
                'relation' => $g->relation,
                'phone' => $g->phone,
                'email' => $g->email,
                'address' => $g->address,
            ])->values()->all(),
            'education' => $s->education->map(fn ($e) => [
                'level' => $e->level,
                'degree_name' => $e->degree_name,
                'major' => $e->major,
                'institution' => $e->institution,
                'start_year' => $e->start_year,
                'end_year' => $e->end_year,
                'grade' => $e->grade_value,
            ])->values()->all(),
            // Extra admission-form fields with no dedicated column (from partner sites).
            'custom' => (array) ($this->custom_fields ?? []),
        ];
    }

    /**
     * Government-scholarship preferences with each university resolved to its
     * name (empty for ordinary program applications).
     *
     * @return array<int, array<string, mixed>>
     */
    private function applicationPreferences(): array
    {
        $preferences = collect($this->preferences ?? []);

        if ($preferences->isEmpty()) {
            return [];
        }

        $names = University::whereIn('id', $preferences->pluck('university_id')->filter()->unique())
            ->pluck('name', 'id');

        return $preferences->map(fn ($p) => [
            'major' => $p['major'] ?? null,
            'university_id' => $p['university_id'] ?? null,
            'university' => ! empty($p['university_id']) ? ($names[$p['university_id']] ?? null) : null,
        ])->values()->all();
    }
}
