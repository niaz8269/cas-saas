<?php

namespace App\Http\Requests\Documents;

class StoreDocumentRequest extends PresignDocumentRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'key' => ['required', 'string', 'max:500'],
        ];
    }
}
