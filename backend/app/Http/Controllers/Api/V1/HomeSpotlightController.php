<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HomeSpotlightItem;
use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Choose and order, by hand, what the home page shows: the three hero universities and the rows of each tab of the
 * "+" panel. The website reads the ids and loads the items through the public lists; an empty list means automatic.
 */
class HomeSpotlightController extends Controller
{
    // ── Public ─────────────────────────────────────────────────────────────

    /** @return JsonResponse {data: {list: [id, ...]}} — ids in the chosen order. */
    public function publicShow(): JsonResponse
    {
        return response()->json(['data' => $this->ids()]);
    }

    // ── Staff ──────────────────────────────────────────────────────────────

    public function show(): JsonResponse
    {
        $lists = [];
        foreach ($this->ids() as $list => $ids) {
            $lists[$list] = $this->describe($list, $ids);
        }

        return response()->json([
            'data' => $lists,
            'limits' => collect(HomeSpotlightItem::LISTS)->map(fn ($def) => $def[1])->all(),
        ]);
    }

    /** Items a list can take, for the "add" search box. */
    public function options(Request $request, string $list): JsonResponse
    {
        abort_unless(isset(HomeSpotlightItem::LISTS[$list]), 404);
        $term = '%'.trim($request->string('q')->value()).'%';
        $type = HomeSpotlightItem::LISTS[$list][0];

        $rows = match ($type) {
            'university' => University::query()->where('status', 'active')
                ->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('name_zh', 'like', $term)->orWhere('city', 'like', $term))
                ->orderBy('name')->limit(20)->get(['id', 'name', 'city']),
            'program' => Program::query()->where('status', 'active')->where('registry_only', false)
                ->whereHas('university', fn ($u) => $u->where('status', 'active'))
                ->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('name_zh', 'like', $term))
                ->with('university:id,name')->orderBy('name')->limit(20)->get(['id', 'name', 'level', 'university_id']),
            'scholarship' => Scholarship::query()->where('status', 'active')
                ->where('name', 'like', $term)->with('university:id,name')->orderBy('name')->limit(20)->get(['id', 'name', 'university_id']),
            default => Post::query()->published()->where('title', 'like', $term)->orderByDesc('published_at')->limit(20)->get(['id', 'title']),
        };

        return response()->json(['data' => $rows->map(fn ($r) => $this->item($type, $r))->values()]);
    }

    /** Saves the lists that are sent; a list sent empty goes back to automatic. */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lists' => ['required', 'array'],
            'lists.*' => ['array'],
            'lists.*.*' => ['integer'],
        ]);

        foreach ($data['lists'] as $list => $ids) {
            if (! isset(HomeSpotlightItem::LISTS[$list])) {
                throw ValidationException::withMessages(['lists' => "Unknown list: {$list}."]);
            }
            [$type, $max] = HomeSpotlightItem::LISTS[$list];
            $ids = array_values(array_unique(array_map('intval', $ids)));
            if (count($ids) > $max) {
                throw ValidationException::withMessages(["lists.{$list}" => "At most {$max} items can be shown here."]);
            }
            $found = $this->model($type)::query()->whereIn('id', $ids)->pluck('id')->all();
            if (count($found) !== count($ids)) {
                throw ValidationException::withMessages(["lists.{$list}" => 'One of the chosen items no longer exists.']);
            }
        }

        DB::transaction(function () use ($data) {
            foreach ($data['lists'] as $list => $ids) {
                HomeSpotlightItem::query()->where('list', $list)->delete();
                foreach (array_values(array_unique(array_map('intval', $ids))) as $i => $id) {
                    HomeSpotlightItem::create(['list' => $list, 'item_id' => $id, 'position' => $i + 1]);
                }
            }
        });

        return $this->show();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /** @return array<string, list<int>> */
    private function ids(): array
    {
        $rows = HomeSpotlightItem::query()->orderBy('position')->get()->groupBy('list');

        return collect(array_keys(HomeSpotlightItem::LISTS))
            ->mapWithKeys(fn ($list) => [$list => ($rows[$list] ?? collect())->pluck('item_id')->map(fn ($id) => (int) $id)->all()])
            ->all();
    }

    /** @param list<int> $ids */
    private function describe(string $list, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $type = HomeSpotlightItem::LISTS[$list][0];
        $query = $this->model($type)::query()->whereIn('id', $ids);
        if (in_array($type, ['program', 'scholarship'], true)) {
            $query->with('university:id,name');
        }
        $rows = $query->get()->keyBy('id');

        return collect($ids)->filter(fn ($id) => $rows->has($id))->map(fn ($id) => $this->item($type, $rows[$id]))->values()->all();
    }

    /** @return array{id: int, label: string, sub: string|null} */
    private function item(string $type, $row): array
    {
        return match ($type) {
            'university' => ['id' => $row->id, 'label' => $row->name, 'sub' => $row->city],
            'program' => ['id' => $row->id, 'label' => $row->name, 'sub' => trim(($row->university?->name ?? '').' · '.ucfirst(str_replace('_', '-', (string) $row->level)), ' ·')],
            'scholarship' => ['id' => $row->id, 'label' => $row->name, 'sub' => $row->university?->name],
            default => ['id' => $row->id, 'label' => $row->title, 'sub' => $row->published_at?->toDateString()],
        };
    }

    private function model(string $type): string
    {
        return match ($type) {
            'university' => University::class,
            'program' => Program::class,
            'scholarship' => Scholarship::class,
            default => Post::class,
        };
    }
}
