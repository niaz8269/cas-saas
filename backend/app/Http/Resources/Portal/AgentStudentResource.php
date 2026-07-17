<?php

namespace App\Http\Resources\Portal;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A student as their agent sees them: progress only. Counselor
 * assignment, passport data and audit columns stay internal.
 *
 * @mixin Student
 */
class AgentStudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_code' => $this->student_code,
            'full_name' => $this->full_name,
            'status' => $this->status,
            'country' => $this->whenLoaded('country', fn () => $this->country?->name),
            'applications_count' => $this->whenCounted('applications'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
