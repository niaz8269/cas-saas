<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Create an invoice for a party (usually a student) with one or more fee lines.
 * Authorization is done in the controller (InvoicePolicy@manage).
 */
class StoreInvoiceRequest extends FormRequest
{
    private const PARTY_TABLES = [
        'student' => 'students',
        'agent' => 'agents',
        'university' => 'universities',
    ];

    public function authorize(): bool
    {
        return true; // policy-checked in the controller
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'party_type' => ['required', Rule::in(array_keys(self::PARTY_TABLES))],
            'party_id' => ['required', 'integer'],
            'application_id' => ['nullable', 'integer', Rule::exists('applications', 'id')],
            'currency' => ['required', 'string', 'size:3'],
            'status' => ['nullable', Rule::in(['draft', 'issued'])],
            'due_days' => ['nullable', 'integer', 'min:0', 'max:365'],

            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.fee_type' => ['nullable', 'string', 'max:40'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['nullable', 'numeric', 'min:0.01', 'max:100000'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:100000000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $type = $this->input('party_type');
            $id = $this->input('party_id');
            $table = self::PARTY_TABLES[$type] ?? null;

            if ($table && $id && ! DB::table($table)->where('id', $id)->exists()) {
                $v->errors()->add('party_id', "No {$type} found for the given party_id.");
            }

            // A linked application must belong to the student being billed.
            $applicationId = $this->input('application_id');
            if ($type === 'student' && $id && $applicationId
                && ! DB::table('applications')->where('id', $applicationId)->where('student_id', $id)->exists()) {
                $v->errors()->add('application_id', 'The application must belong to the selected student.');
            }
        });
    }
}
