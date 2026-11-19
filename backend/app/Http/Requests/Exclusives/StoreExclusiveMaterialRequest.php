<?php

namespace App\Http\Requests\Exclusives;

use App\Models\ExclusiveMaterial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExclusiveMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by the route permission
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::in(ExclusiveMaterial::CATEGORIES)],
            // Documents, images, archives and short clips; never executables or scripts.
            'file' => ['required', 'file', 'max:'.ExclusiveMaterial::MAX_KB, 'mimes:pdf,png,jpg,jpeg,webp,gif,svg,mp4,mov,zip,doc,docx,xls,xlsx,ppt,pptx,txt,csv'],
        ];
    }
}
