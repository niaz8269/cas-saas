<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HomeSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Manage the public home page from the admin panel: reorder sections, hide or show them, edit their text,
 * links and images, and add or delete custom sections. The hero always stays first and visible.
 *
 * The content JSON is `{ images: {...}, <locale>: { texts: {...}, lists: {...} } }`. Only changes are stored;
 * the site falls back to its standard text for anything missing.
 */
class HomeSectionController extends Controller
{
    private const LOCALES = ['en', 'zh', 'ar', 'fr', 'id'];

    private const MAX_JSON_BYTES = 60000;

    // ── Public ─────────────────────────────────────────────────────────────

    public function publicIndex(): JsonResponse
    {
        $rows = HomeSection::query()->where(fn ($q) => $q->where('is_visible', true)->orWhere('key', 'hero'))
            ->orderBy('sort_order')->orderBy('id')->get(['key', 'type', 'content']);

        return response()->json(['data' => $rows]);
    }

    // ── Staff ──────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(['data' => HomeSection::query()->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function update(Request $request, HomeSection $section): JsonResponse
    {
        $data = $request->validate([
            'is_visible' => ['sometimes', 'boolean'],
            'content' => ['sometimes', 'nullable', 'array'],
        ]);

        if (array_key_exists('is_visible', $data) && ! $data['is_visible'] && $section->isHero()) {
            throw ValidationException::withMessages(['is_visible' => 'The top banner of the home page cannot be hidden. You can edit it instead.']);
        }
        if (array_key_exists('content', $data)) {
            $data['content'] = $data['content'] === null ? null : $this->cleanContent($data['content']);
        }

        $section->update($data + ['updated_by' => $request->user()->id]);

        return response()->json(['data' => $section->fresh()]);
    }

    /** Back to the standard text: drops every change, keeps the place and visibility. */
    public function reset(Request $request, HomeSection $section): JsonResponse
    {
        $section->update(['content' => null, 'updated_by' => $request->user()->id]);

        return response()->json(['data' => $section->fresh()]);
    }

    /** Set the order. The hero is always kept first, whatever is sent. */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', Rule::exists('home_sections', 'id')],
        ]);

        $ids = collect($data['order'])->unique()->values();
        $hero = HomeSection::where('key', 'hero')->value('id');
        $ids = $ids->reject(fn ($id) => $id === $hero)->prepend($hero)->filter()->values();
        // Sections not mentioned keep their relative order, after the ones that were.
        $rest = HomeSection::whereNotIn('id', $ids)->orderBy('sort_order')->pluck('id');

        $ids->concat($rest)->each(fn ($id, $i) => HomeSection::whereKey($id)->update(['sort_order' => ($i + 1) * 10]));

        return response()->json(['data' => HomeSection::query()->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(HomeSection::CUSTOM_TYPES)],
            'content' => ['sometimes', 'nullable', 'array'],
            'is_visible' => ['sometimes', 'boolean'],
        ]);

        $section = HomeSection::create([
            'key' => 'custom-'.Str::lower(Str::random(6)),
            'type' => $data['type'],
            'sort_order' => ((int) HomeSection::max('sort_order')) + 10,
            'is_visible' => $data['is_visible'] ?? true,
            'content' => isset($data['content']) ? $this->cleanContent($data['content']) : null,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $section], 201);
    }

    public function destroy(HomeSection $section): Response
    {
        if (! $section->isCustom()) {
            throw ValidationException::withMessages(['section' => 'Standard sections cannot be deleted. Hide them, or reset them to the standard text.']);
        }

        $section->delete();

        return response()->noContent();
    }

    // ── Validation of the free-form content ────────────────────────────────

    /**
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    private function cleanContent(array $content): array
    {
        if (strlen((string) json_encode($content)) > self::MAX_JSON_BYTES) {
            throw ValidationException::withMessages(['content' => 'This is too much content for one section.']);
        }

        $clean = [];
        foreach ($content as $key => $value) {
            if ($key === 'images') {
                $clean['images'] = $this->cleanImages((array) $value);
            } elseif (in_array($key, self::LOCALES, true) && is_array($value)) {
                $clean[$key] = $this->walk($value, "content.$key");
            } else {
                throw ValidationException::withMessages(['content' => "Unknown content key \"$key\"."]);
            }
        }

        return $clean;
    }

    /** @param array<string, mixed> $images */
    private function cleanImages(array $images): array
    {
        $out = [];
        foreach ($images as $name => $path) {
            if ($path === null || $path === '') {
                continue;
            }
            if (! is_string($path) || ! preg_match('#^(/uploads/|/images/|/photos/|https://)[^\s<>"\']+$#', $path)) {
                throw ValidationException::withMessages(["content.images.$name" => 'Use an image uploaded here or a secure https link.']);
            }
            $out[$name] = $path;
        }

        return $out;
    }

    /** Strings only, trimmed and bounded; anything that is a link must be a safe one. */
    private function walk(mixed $value, string $path, ?string $key = null): mixed
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $out[$k] = $this->walk($v, "$path.$k", is_string($k) ? $k : $key);
            }

            return $out;
        }

        if ($value === null || is_bool($value) || is_numeric($value)) {
            return $value;
        }

        if (! is_string($value)) {
            throw ValidationException::withMessages([$path => 'Text only.']);
        }

        $value = trim($value);
        if (mb_strlen($value) > 2000) {
            throw ValidationException::withMessages([$path => 'That text is too long.']);
        }
        if ($key !== null && ($key === 'to' || str_ends_with(strtolower($key), 'link')) && $value !== '' && ! preg_match('#^(/|https?://|mailto:|tel:)[^\s<>"\']*$#i', $value)) {
            throw ValidationException::withMessages([$path => 'A link must start with / (a page on this site) or https://.']);
        }

        return $value;
    }
}
