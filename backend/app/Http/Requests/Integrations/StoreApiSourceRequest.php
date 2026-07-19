<?php

namespace App\Http\Requests\Integrations;

use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreApiSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by permission:settings.manage.global,staff on the route
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique('api_sources', 'name')->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['website', 'agent', 'campaign', 'manual'])],
            'website_url' => ['nullable', 'url', 'max:255'],
            'university_id' => ['nullable', 'integer', Rule::exists('universities', 'id')],
            'default_program_id' => ['nullable', 'integer', Rule::exists('programs', 'id')],
            'is_active' => ['boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $programId = $this->input('default_program_id');
            $universityId = $this->input('university_id');

            // A default program must belong to the source's university.
            if ($programId && $universityId
                && ! Program::where('id', $programId)->where('university_id', $universityId)->exists()) {
                $v->errors()->add('default_program_id', 'The default program must belong to the selected university.');
            }
        });
    }
}
