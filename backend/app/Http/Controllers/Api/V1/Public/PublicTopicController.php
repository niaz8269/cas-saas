<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Services\Seo\TopicPages;
use Illuminate\Http\JsonResponse;

class PublicTopicController extends Controller
{
    public function __construct(private readonly TopicPages $topics) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->topics->index()]);
    }

    public function show(string $slug): JsonResponse
    {
        $page = $this->topics->find($slug);
        abort_unless($page, 404);

        return response()->json(['data' => $page]);
    }
}
