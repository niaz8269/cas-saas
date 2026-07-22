<?php

namespace App\Http\Resources;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public (website) view of a published post. The list endpoint selects columns
 * without `body`, so it is omitted there and present on the detail endpoint.
 *
 * @mixin Post
 */
class PublicPostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'body' => $this->when(array_key_exists('body', $this->resource->getAttributes()), fn () => $this->body),
            'cover_image_url' => $this->cover_image_path,
            'category' => $this->category,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => $this->author?->name),
            'event_date' => $this->event_date?->toIso8601String(),
            'location' => $this->location,
            'register_url' => $this->register_url,
        ];
    }
}
