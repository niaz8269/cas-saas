<?php

namespace App\Http\Resources\Portal;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The student's own portal profile. Internal fields (counselor assignment,
 * agent attribution, audit columns) are deliberately absent.
 *
 * @mixin Student
 */
class StudentProfileResource extends JsonResource
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
            'phone' => $this->phone,
            'status' => $this->status,
            'country' => $this->whenLoaded('country', fn () => $this->country ? [
                'id' => $this->country->id, 'name' => $this->country->name,
            ] : null),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ];
    }
}
