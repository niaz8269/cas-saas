<?php

namespace App\Http\Requests\Portal;

use Illuminate\Validation\Rule;

/**
 * The agent on-behalf government-scholarship payload: the same scholarship +
 * level + preferences + profile/guardians/education as the student variant,
 * plus a target `student_id` that must be one of the acting agent's OWN
 * students (the agent guard scopes everything else).
 */
class AgentStoreScholarshipApplicationRequest extends StudentStoreScholarshipApplicationRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_merge([
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('agent_id', $this->user()->id),
            ],
        ], parent::rules());
    }
}
