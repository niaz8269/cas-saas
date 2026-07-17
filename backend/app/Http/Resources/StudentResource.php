<?php

namespace App\Http\Resources;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Student
 */
class StudentResource extends JsonResource
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
            'passport_no' => $this->passport_no,
            'dob' => $this->dob?->toDateString(),
            'gender' => $this->gender,
            'status' => $this->status,
            'country' => $this->whenLoaded('country', fn () => $this->country ? [
                'id' => $this->country->id, 'name' => $this->country->name, 'iso2' => $this->country->iso2,
            ] : null),
            'branch' => $this->whenLoaded('branch', fn () => $this->branch ? [
                'id' => $this->branch->id, 'name' => $this->branch->name, 'code' => $this->branch->code,
            ] : null),
            'agent' => $this->whenLoaded('agent', fn () => $this->agent ? [
                'id' => $this->agent->id, 'name' => $this->agent->name, 'agent_code' => $this->agent->agent_code,
            ] : null),
            'counselor' => $this->whenLoaded('counselor', fn () => $this->counselor ? [
                'id' => $this->counselor->id, 'name' => $this->counselor->name,
            ] : null),
            'guardians' => $this->whenLoaded('guardians', fn () => $this->guardians->map(fn ($g) => [
                'id' => $g->id, 'name' => $g->name, 'relation' => $g->relation, 'phone' => $g->phone,
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
