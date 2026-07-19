<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

/**
 * A full direct-admission application pushed by a partner site (API-key auth),
 * e.g. the Xinjiang Medical MBBS site. The program defaults to the source's
 * default program; the payload may override it. Documents arrive base64-encoded.
 *
 * Partner forms use their own field labels (given_name/surname, tel,
 * present_address, passport_expiry, an emergency block, …). prepareForValidation()
 * normalises those aliases to the ERP's canonical keys so rules() and the
 * ingestion service work against one stable shape.
 */
class IngestApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the api-source middleware authenticates the key
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'program_id' => ['nullable', 'integer', Rule::exists('programs', 'id')],
            'declared_degree' => ['nullable', 'string', 'max:60'],
            'declared_major' => ['nullable', 'string', 'max:120'],

            'student' => ['required', 'array'],
            'student.first_name' => ['required', 'string', 'max:100'],
            'student.last_name' => ['nullable', 'string', 'max:100'],
            'student.chinese_name' => ['nullable', 'string', 'max:120'],
            'student.email' => ['nullable', 'required_without:student.passport_no', 'email', 'max:190'],
            'student.alternate_email' => ['nullable', 'email', 'max:190'],
            'student.phone' => ['nullable', 'string', 'max:30'],
            'student.wechat_id' => ['nullable', 'string', 'max:80'],
            'student.skype_id' => ['nullable', 'string', 'max:80'],
            'student.passport_no' => ['nullable', 'string', 'max:50'],
            'student.passport_expiry_date' => ['nullable', 'date'],
            'student.dob' => ['nullable', 'date'],
            'student.gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'student.marital_status' => ['nullable', 'string', 'max:20'],
            'student.religion' => ['nullable', 'string', 'max:60'],
            'student.native_language' => ['nullable', 'string', 'max:60'],
            'student.nationality' => ['nullable', 'string', 'max:100'],
            'student.place_of_birth' => ['nullable', 'string', 'max:120'],
            'student.city' => ['nullable', 'string', 'max:120'],
            'student.current_address' => ['nullable', 'string', 'max:255'],
            'student.permanent_address' => ['nullable', 'string', 'max:255'],

            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.name' => ['required_with:emergency_contact', 'string', 'max:150'],
            'emergency_contact.relation' => ['nullable', 'string', 'max:50'],
            'emergency_contact.phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact.email' => ['nullable', 'email', 'max:190'],
            'emergency_contact.address' => ['nullable', 'string', 'max:255'],

            'guardians' => ['nullable', 'array', 'max:5'],
            'guardians.*.relation' => ['required', 'string', 'max:50'],
            'guardians.*.name' => ['required', 'string', 'max:150'],
            'guardians.*.phone' => ['nullable', 'string', 'max:30'],
            'guardians.*.email' => ['nullable', 'email', 'max:190'],
            'guardians.*.address' => ['nullable', 'string', 'max:255'],

            'education' => ['nullable', 'array', 'max:6'],
            'education.*.level' => ['nullable', 'string', 'max:40'],
            'education.*.degree_name' => ['nullable', 'string', 'max:150'],
            'education.*.major' => ['nullable', 'string', 'max:150'],
            'education.*.institution' => ['nullable', 'string', 'max:190'],
            'education.*.start_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'education.*.end_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'education.*.grade_value' => ['nullable', 'string', 'max:30'],

            'documents' => ['nullable', 'array', 'max:20'],
            'documents.*.type' => ['required', 'string', 'max:120'],
            'documents.*.file_name' => ['required', 'string', 'max:255'],
            'documents.*.mime' => ['nullable', 'string', 'max:120'],
            'documents.*.content' => ['required', 'string'], // base64-encoded bytes
        ];
    }

    /**
     * Normalise partner-site field aliases to the ERP's canonical keys.
     */
    protected function prepareForValidation(): void
    {
        $student = (array) $this->input('student', []);

        $student = $this->pullAliases($student, [
            'first_name' => ['given_name', 'givenname'],
            'last_name' => ['surname', 'family_name'],
            'phone' => ['tel', 'telephone', 'mobile'],
            'current_address' => ['present_address'],
            'passport_expiry_date' => ['passport_expiry'],
        ]);

        if (isset($student['gender']) && is_string($student['gender'])) {
            $student['gender'] = strtolower(trim($student['gender']));
        }

        // Partner forms split birthplace into country + city; the ERP keeps a
        // single place_of_birth string.
        if (empty($student['place_of_birth'])) {
            $birth = array_filter([
                $student['city_of_birth'] ?? null,
                $student['country_of_birth'] ?? null,
            ], fn ($v) => filled($v));

            if ($birth !== []) {
                $student['place_of_birth'] = implode(', ', $birth);
            }
        }
        unset($student['city_of_birth'], $student['country_of_birth']);

        $emergency = $this->input('emergency_contact');
        if (is_array($emergency)) {
            $emergency = $this->pullAliases($emergency, [
                'phone' => ['tel', 'telephone'],
                'relation' => ['relationship'],
            ]);
            // 'gender' has no guardian column; drop it silently.
            unset($emergency['gender']);
            $this->merge(['emergency_contact' => $emergency]);
        }

        $education = $this->input('education');
        if (is_array($education)) {
            $education = array_map(function ($row) {
                if (! is_array($row)) {
                    return $row;
                }
                $row = $this->pullAliases($row, [
                    'degree_name' => ['degree', 'qualification'],
                    'major' => ['field', 'field_of_study', 'subject'],
                    'start_year' => ['start_date', 'from', 'from_year'],
                    'end_year' => ['end_date', 'to', 'to_year'],
                ]);
                foreach (['start_year', 'end_year'] as $k) {
                    if (isset($row[$k]) && ! is_int($row[$k])) {
                        $row[$k] = $this->extractYear($row[$k]);
                    }
                }

                return $row;
            }, $education);
            $this->merge(['education' => array_values($education)]);
        }

        $this->merge([
            'student' => $student,
            'declared_degree' => $this->input('declared_degree', $this->input('degree')),
            'declared_major' => $this->input('declared_major', $this->input('major')),
        ]);
    }

    /**
     * Move any present alias key onto its canonical key (canonical wins if set).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, array<int, string>>  $map  canonical => [aliases]
     * @return array<string, mixed>
     */
    private function pullAliases(array $data, array $map): array
    {
        foreach ($map as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if (! Arr::has($data, $canonical) && Arr::has($data, $alias) && filled($data[$alias])) {
                    $data[$canonical] = $data[$alias];
                }
                unset($data[$alias]);
            }
        }

        return $data;
    }

    /** Pull a 4-digit year out of a date/string, or null. */
    private function extractYear(mixed $value): ?int
    {
        if (is_numeric($value)) {
            $n = (int) $value;

            return ($n >= 1950 && $n <= 2100) ? $n : null;
        }

        if (is_string($value) && preg_match('/(19|20)\d{2}/', $value, $m)) {
            return (int) $m[0];
        }

        return null;
    }
}
