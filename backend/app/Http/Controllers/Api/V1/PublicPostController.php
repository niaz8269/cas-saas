<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicPostResource;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Public website content — only published posts. The list omits the (heavy)
 * body; the detail endpoint returns it.
 */
class PublicPostController extends Controller
{
    /** List columns — deliberately excludes `body`. */
    private const LIST_COLUMNS = [
        'id', 'type', 'title', 'slug', 'excerpt', 'cover_image_path',
        'category', 'published_at', 'author_id', 'event_date', 'location', 'register_url',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $type = $request->string('type')->value();

        $posts = Post::query()
            ->published()
            ->when(in_array($type, Post::TYPES, true), fn ($q) => $q->where('type', $type))
            ->when($request->filled('q'), fn ($q) => $q->where('title', 'like', '%'.$request->string('q').'%'))
            ->with('author:id,name')
            ->orderByDesc('published_at')
            ->paginate(min($request->integer('per_page', 12), 50), self::LIST_COLUMNS);

        return PublicPostResource::collection($posts);
    }

    public function show(string $slug): PublicPostResource
    {
        $post = Post::query()
            ->published()
            ->where('slug', $slug)
            ->with('author:id,name')
            ->firstOrFail();

        return new PublicPostResource($post);
    }
}
