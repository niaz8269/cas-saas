<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\StorePostRequest;
use App\Http\Requests\Content\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\Content\HtmlSanitizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Admin content management (blogs / news / events). The WYSIWYG `body` HTML is
 * sanitized server-side before it is stored. Gated by content.view.global
 * (read) / content.manage.global (write).
 */
class PostController extends Controller
{
    public function __construct(private readonly HtmlSanitizer $sanitizer) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = Post::query()
            ->with('author:id,name')
            ->when($request->filled('filter.type'), fn ($q) => $q->where('type', $request->input('filter.type')))
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('q'), fn ($q) => $q->where('title', 'like', '%'.$request->string('q').'%'))
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return PostResource::collection($posts);
    }

    public function store(StorePostRequest $request): PostResource
    {
        $post = Post::create($this->payload($request));

        return new PostResource($post->load('author:id,name'));
    }

    public function show(Post $post): PostResource
    {
        return new PostResource($post->load('author:id,name'));
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $post->update($this->payload($request, $post));

        return new PostResource($post->fresh('author:id,name'));
    }

    public function destroy(Post $post): Response
    {
        $post->delete();

        return response()->noContent();
    }

    /**
     * Validated write payload: sanitize the body, stamp published_at on first
     * publish, and set the author on create.
     *
     * @return array<string, mixed>
     */
    private function payload(FormRequest $request, ?Post $post = null): array
    {
        /** @var array<string, mixed> $data */
        $data = $request->validated();

        if (array_key_exists('body', $data)) {
            $data['body'] = $this->sanitizer->clean($data['body']);
        }

        $publishing = ($data['status'] ?? $post?->status) === 'published';
        if ($publishing && empty($data['published_at']) && empty($post?->published_at)) {
            $data['published_at'] = now();
        }

        if ($post === null) {
            $data['author_id'] = $request->user()?->id;
        }

        return $data;
    }
}
