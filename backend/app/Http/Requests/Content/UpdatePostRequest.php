<?php

namespace App\Http\Requests\Content;

use Illuminate\Validation\Rule;

class UpdatePostRequest extends StorePostRequest
{
    /**
     * Required fields become "sometimes"; the slug-unique rule ignores this post.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_map(
            fn (array $rules) => array_map(fn ($rule) => $rule === 'required' ? 'sometimes' : $rule, $rules),
            parent::rules(),
        );
    }

    protected function slugUnique(): object
    {
        return Rule::unique('posts', 'slug')->ignore($this->route('post'))->whereNull('deleted_at');
    }
}
