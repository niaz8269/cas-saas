<?php

namespace App\Http\Requests\Portal;

use App\Services\Documents\DocumentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentStoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'document_type_id' => ['required', 'integer', Rule::exists('document_types', 'id')],
            'key' => ['required', 'string', 'max:500'],
            'file_name' => ['required', 'string', 'max:255'],
            'mime' => ['required', Rule::in(DocumentService::ALLOWED_MIMES)],
            'size' => ['required', 'integer', 'min:1', 'max:'.DocumentService::MAX_BYTES],
        ];
    }
}
