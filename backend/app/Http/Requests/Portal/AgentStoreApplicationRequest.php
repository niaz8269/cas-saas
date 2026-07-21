<?php

namespace App\Http\Requests\Portal;

use Illuminate\Validation\Rule;

/**
 * The agent on-behalf apply payload: the same program choice + funding +
 * profile/guardians/education as the student wizard, plus a target `student_id`
 * that must be one of the acting agent's OWN students (the agent guard scopes
 * everything else).
 */
class AgentStoreApplicationRequest extends StudentStoreApplicationRequest
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
