<?php

namespace App\Http\Requests\Portal;

use App\Services\Documents\DocumentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Registering a payment receipt the student has already uploaded to storage.
 * Mirrors {@see StudentStoreDocumentRequest}, minus the type picker — the
 * receipt's document type is fixed by the endpoint, not chosen by the client.
 */
class StudentStoreReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the student guard plus the invoice ownership check is the scope
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:500'],
            'file_name' => ['required', 'string', 'max:255'],
            'mime' => ['required', Rule::in(DocumentService::ALLOWED_MIMES)],
            'size' => ['required', 'integer', 'min:1', 'max:'.DocumentService::MAX_BYTES],
        ];
    }
}
