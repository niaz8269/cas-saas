<?php

namespace App\Http\Requests\Portal;

use App\Http\Requests\Portal\Concerns\ValidatesApplicantData;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A student, or the partner who added them, updating the applicant record after an application has gone in:
 * profile, family and prior education, validated exactly as the apply wizards and the add-student form do.
 */
class UpdateApplicantDetailsRequest extends FormRequest
{
    use ValidatesApplicantData;

    public function authorize(): bool
    {
        return true; // the guard scopes it: a student edits their own record, a partner their own students
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return $this->applicantDataRules();
    }
}
