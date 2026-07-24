<?php

namespace App\Support;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Applies the `sort=field` / `sort=-field` API convention to a list query,
 * restricted to an allowlist of sortable columns. Falls back to the default
 * column (descending) when the param is absent or not in the allowlist, so an
 * unknown/hostile sort value can never order by an arbitrary column.
 */
class SortQuery
{
    /**
     * @param  array<int, string>  $allowed
     */
    public static function apply(Builder $query, Request $request, array $allowed, string $default = 'created_at'): Builder
    {
        $sort = (string) $request->query('sort', '');
        $descending = str_starts_with($sort, '-');
        $column = ltrim($sort, '-');

        if ($column === '' || ! in_array($column, $allowed, true)) {
            return $query->orderByDesc($default);
        }

        return $query->orderBy($column, $descending ? 'desc' : 'asc');
    }
}
