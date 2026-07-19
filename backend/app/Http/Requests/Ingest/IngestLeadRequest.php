<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngestLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // authenticated by the api-source middleware
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:190', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'passport_no' => ['nullable', 'string', 'max:50'],
            'dob' => ['nullable', 'date'],
            'country' => ['nullable', 'string', 'size:2', Rule::exists('countries', 'iso2')],
            'intake_route' => ['sometimes', Rule::in(['info', 'full'])],
            // Which external form the lead came from (contact, consultation,
            // event, callback, …). Free-form so any site's forms fit; slugged below.
            'form_type' => ['nullable', 'string', 'max:40'],
            // The form's own extra questions (event name/date, preferred time, …).
            'fields' => ['nullable', 'array', 'max:60'],
            'fields.*' => ['nullable', 'string', 'max:2000'],
            'website_domain' => ['nullable', 'string', 'max:190'],
            'campaign_utm' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('form_type')) {
            $this->merge(['form_type' => str($this->input('form_type'))->slug('_')->limit(40, '')->value()]);
        }

        // Stringify scalar field values so mixed form payloads validate uniformly.
        if (is_array($this->input('fields'))) {
            $fields = [];
            foreach ($this->input('fields') as $key => $value) {
                if (is_scalar($value) && filled($value)) {
                    $fields[$key] = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
                }
            }
            $this->merge(['fields' => $fields]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Provide at least an email or a phone number.',
            'phone.required_without' => 'Provide at least an email or a phone number.',
        ];
    }
}
