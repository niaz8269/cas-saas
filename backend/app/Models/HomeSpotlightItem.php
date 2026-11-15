<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One hand-picked item on the home page, with its place in its list. */
class HomeSpotlightItem extends Model
{
    /** list key => [type of item, most items shown]. */
    public const LISTS = [
        'hero_universities' => ['university', 3],
        'update_universities' => ['university', 6],
        'update_programs' => ['program', 6],
        'update_scholarships' => ['scholarship', 6],
        'update_posts' => ['post', 6],
    ];

    /** "3,1,2" or null → [3, 1, 2]. */
    public static function parseIds(mixed $value): array
    {
        return array_values(array_filter(array_map('intval', explode(',', (string) $value))));
    }

    /** SQL that sorts rows by their place in the given id list (works on MySQL and SQLite). */
    public static function orderExpression(array $ids): string
    {
        if ($ids === []) {
            return '1';
        }
        $cases = '';
        foreach (array_values($ids) as $i => $id) {
            $cases .= ' when '.(int) $id.' then '.($i + 1);
        }

        return 'case id'.$cases.' else '.(count($ids) + 1).' end';
    }

    protected $fillable = ['list', 'item_id', 'position'];
}
