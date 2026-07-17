<?php

namespace App\Http\Requests\Portal;

use App\Services\Documents\DocumentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentPresignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the student guard is the scope
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'document_type_id' => ['required', 'integer', Rule::exists('document_types', 'id')],
            'file_name' => ['required', 'string', 'max:255'],
            'mime' => ['required', Rule::in(DocumentService::ALLOWED_MIMES)],
            'size' => ['required', 'integer', 'min:1', 'max:'.DocumentService::MAX_BYTES],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mime.in' => 'Unsupported file type. Allowed: PDF, JPEG, PNG, WebP, Word.',
            'size.max' => 'Files may not exceed 25 MB.',
        ];
    }
}
