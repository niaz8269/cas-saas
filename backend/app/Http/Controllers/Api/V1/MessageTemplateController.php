<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Comms\Templates;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * Read-only list of the configured message templates for the settings
 * screen (the copy is defined in code — Templates::TEMPLATES).
 */
class MessageTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $data = collect(Templates::TEMPLATES)->map(fn (array $tpl, string $key) => [
            'key' => $key,
            'subject' => $tpl['subject'],
            'preview' => Str::limit(str_replace("\n", ' ', $tpl['body']), 120),
        ])->values();

        return response()->json(['data' => $data]);
    }
}
