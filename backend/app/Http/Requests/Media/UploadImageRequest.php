<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;

class UploadImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route is permission-gated
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'], // 5 MB
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image.max' => 'Images may not exceed 5 MB.',
            'image.mimes' => 'Use a JPEG, PNG or WebP image.',
        ];
    }
}
