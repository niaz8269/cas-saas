<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicPostResource;
use App\Models\Post;
use App\Services\Search\FuzzySearch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Public website content — only published posts. The list omits the (heavy)
 * body; the detail endpoint returns it.
 */
class PublicPostController extends Controller
{
    public function __construct(private readonly FuzzySearch $fuzzy) {}

    /** List columns — deliberately excludes `body`. */
    private const LIST_COLUMNS = [
        'id', 'type', 'title', 'slug', 'excerpt', 'translations', 'cover_image_path',
        'category', 'published_at', 'author_id', 'event_date', 'location', 'register_url',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $type = $request->string('type')->value();

        $perPage = min($request->integer('per_page', 12), 50);
        $text = trim($request->string('q')->value());

        $build = fn (array $terms) => Post::query()
            ->published()
            ->when(in_array($type, Post::TYPES, true), fn ($q) => $q->where('type', $type))
            ->when($terms !== [], fn ($q) => $q->where(function ($outer) use ($terms) {
                foreach ($terms as $term) {
                    $outer->orWhere('title', 'like', '%'.$term.'%');
                }
            }))
            ->with('author:id,name')
            ->orderByDesc('published_at');

        $posts = $build($text !== '' ? [$text] : [])->paginate($perPage, self::LIST_COLUMNS);
        $suggestion = null;

        // Nothing found: retry with misspelled words corrected to words that appear in the news titles.
        if ($text !== '' && $posts->total() === 0) {
            $fixed = $this->fuzzy->corrections('posts', $text, fn () => Post::query()->published()->pluck('title'));
            foreach ($fixed as $spelling) {
                $retry = $build([$spelling])->paginate($perPage, self::LIST_COLUMNS);
                if ($retry->total() > 0) {
                    $posts = $retry;
                    $suggestion = ['original' => $text, 'query' => $spelling];
                    break;
                }
            }
        }

        return PublicPostResource::collection($posts)->additional(['suggestion' => $suggestion]);
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
