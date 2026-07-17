<?php

namespace App\Http\Requests\Documents;

use App\Services\Documents\DocumentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PresignDocumentRequest extends FormRequest
{
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
            'documentable_type' => ['required', Rule::in(array_keys(DocumentService::DOCUMENTABLES))],
            'documentable_id' => ['required', 'integer'],
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
