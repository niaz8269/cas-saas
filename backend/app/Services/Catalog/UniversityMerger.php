<?php

namespace App\Services\Catalog;

use App\Models\University;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Folds a university record that carries an old name into the record that carries the new one, after the
 * university was renamed. Everything attached to the old record (programs, intakes, scholarships, contacts,
 * agreements, exclusives) moves to the new one; the old record is soft-deleted, not destroyed, so the change can
 * be undone. Rows that would duplicate one the new record already has are left behind with the old record.
 */
class UniversityMerger
{
    /** Tables whose rows must stay unique per university, and the columns that make them so. */
    private const UNIQUE_BY = [
        'programs' => ['name', 'level'],
        'intakes' => ['name'],
    ];

    /**
     * @return array<string, int> rows moved, by table
     */
    public function merge(string $oldSlug, string $newSlug): array
    {
        $old = University::withTrashed()->where('slug', $oldSlug)->first();
        $new = University::withTrashed()->where('slug', $newSlug)->first();

        if (! $old || ! $new || $old->id === $new->id) {
            return [];
        }

        return DB::transaction(function () use ($old, $new) {
            $moved = [];

            foreach (Schema::getTables() as $table) {
                $name = $table['name'];
                if ($name === 'universities' || ! Schema::hasColumn($name, 'university_id')) {
                    continue;
                }

                $rows = DB::table($name)->where('university_id', $old->id);
                $keys = self::UNIQUE_BY[$name] ?? null;

                if ($keys) {
                    $rows = $rows->whereNotExists(function ($q) use ($name, $new, $keys) {
                        $q->select(DB::raw(1))->from($name.' as dup')->where('dup.university_id', $new->id);
                        foreach ($keys as $key) {
                            $q->whereColumn("dup.$key", "$name.$key");
                        }
                    });
                }

                $count = $rows->update(['university_id' => $new->id]);
                if ($count > 0) {
                    $moved[$name] = $count;
                }
            }

            // A scholarship offered by several universities lists them in a pivot.
            if (Schema::hasTable('scholarship_universities')) {
                $pivot = DB::table('scholarship_universities')->where('university_id', $old->id)
                    ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('scholarship_universities as dup')
                        ->where('dup.university_id', $new->id)->whereColumn('dup.scholarship_id', 'scholarship_universities.scholarship_id'))
                    ->update(['university_id' => $new->id]);
                if ($pivot > 0) {
                    $moved['scholarship_universities'] = $pivot;
                }
            }

            // Fill anything the new record lacks from the old one, then retire the old record.
            foreach (['website', 'international_admissions_url', 'logo_path', 'emblem_path', 'cover_path', 'cover_credit', 'founded_year', 'institution_type', 'nearest_airport'] as $column) {
                if (Schema::hasColumn('universities', $column) && blank($new->{$column}) && filled($old->{$column})) {
                    $new->{$column} = $old->{$column};
                }
            }
            $new->save();
            $old->delete();

            return $moved;
        });
    }
}
