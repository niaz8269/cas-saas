<?php

namespace App\Http\Requests\Content;

use App\Models\Post;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by the route permission
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(Post::TYPES)],
            'title' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $this->slugUnique()],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string'],
            // Per-locale overrides (unknown locale keys are dropped server-side).
            'translations' => ['nullable', 'array'],
            'translations.*' => ['array'],
            'translations.*.title' => ['nullable', 'string', 'max:200'],
            'translations.*.excerpt' => ['nullable', 'string', 'max:500'],
            'translations.*.body' => ['nullable', 'string'],
            'cover_image_path' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:80'],
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
            'published_at' => ['nullable', 'date'],
            // Event-only
            'event_date' => ['nullable', 'date', 'required_if:type,event'],
            'location' => ['nullable', 'string', 'max:180'],
            'register_url' => ['nullable', 'string', 'max:255', 'url'],
        ];
    }

    protected function slugUnique(): object
    {
        return Rule::unique('posts', 'slug')->whereNull('deleted_at');
    }
}
