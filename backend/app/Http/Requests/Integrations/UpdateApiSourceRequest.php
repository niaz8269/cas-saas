<?php

namespace App\Http\Requests\Integrations;

use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateApiSourceRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:150',
                Rule::unique('api_sources', 'name')->whereNull('deleted_at')->ignore($this->route('apiSource')?->id)],
            'type' => ['sometimes', 'required', Rule::in(['website', 'agent', 'campaign', 'manual'])],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'university_id' => ['sometimes', 'nullable', 'integer', Rule::exists('universities', 'id')],
            'default_program_id' => ['sometimes', 'nullable', 'integer', Rule::exists('programs', 'id')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $source = $this->route('apiSource');
            $programId = $this->input('default_program_id', $source?->default_program_id);
            $universityId = $this->input('university_id', $source?->university_id);

            if ($programId && $universityId
                && ! Program::where('id', $programId)->where('university_id', $universityId)->exists()) {
                $v->errors()->add('default_program_id', 'The default program must belong to the selected university.');
            }
        });
    }
}
