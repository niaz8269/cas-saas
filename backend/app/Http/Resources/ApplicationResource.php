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
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_code' => $this->student->student_code,
                'full_name' => $this->student->full_name,
            ]),
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
