<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Institution facts and an introduction taken from each university's English
 * Wikipedia article (text is CC BY-SA 4.0, so the article link is stored for
 * attribution), plus a freely licensed campus photo from Wikimedia Commons.
 *
 * Never overwrites what is already there: the introduction is only filled in
 * when the university has none, and a campus photo only when it has no cover.
 */
class WikipediaProfileSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/wikipedia_universities.json');
        $rows = is_file($path) ? (json_decode(file_get_contents($path), true)['universities'] ?? []) : [];

        foreach (University::whereIn('slug', array_keys($rows))->get() as $uni) {
            $row = $rows[$uni->slug];
            $update = [
                'wikipedia_url' => $row['wp'],
                'founded_year' => $row['est'] ?: null,
                'institution_type' => $this->type($row['type'] ?? null),
                'student_count' => $row['stu'] ?? null,
            ];

            if (blank($uni->about) && filled($row['x'] ?? null)) {
                $update['about'] = $row['x'];
            }

            if (blank($uni->cover_path) && ! empty($row['img'])) {
                $img = $row['img'];
                $update['cover_path'] = $img['u'];
                $update['cover_credit'] = $img['a'].', '.$img['l'].', via Wikimedia Commons';
                $update['cover_source_url'] = $img['s'];
            }

            $uni->forceFill($update)->save();
        }

        $this->cityPhotos();
        $this->factualIntroductions();
    }

    /** A short factual line for universities that still have no introduction, built only from catalog data. */
    private function factualIntroductions(): void
    {
        foreach (University::where(fn ($q) => $q->whereNull('about')->orWhere('about', ''))->withCount('programs')->get() as $uni) {
            $place = collect([$uni->city, $uni->province, 'China'])->filter()->unique()->implode(', ');
            $languages = $uni->programs()->whereNotNull('teaching_language')->distinct()->orderBy('teaching_language')->pluck('teaching_language')->implode(' and ');
            $text = $uni->name.($uni->name_zh ? ' ('.$uni->name_zh.')' : '').' is a university in '.$place.'.';
            if ($uni->programs_count > 0) {
                $text .= ' This page lists '.$uni->programs_count.' program'.($uni->programs_count === 1 ? '' : 's').' for international students'.($languages ? ', taught in '.$languages : '').'.';
            }
            $uni->forceFill(['about' => $text])->save();
        }
    }

    /** A photo of the city for universities that still have no campus photo. */
    private function cityPhotos(): void
    {
        $path = database_path('data/wikipedia_city_photos.json');
        $photos = is_file($path) ? json_decode(file_get_contents($path), true) : [];

        foreach (University::where(fn ($q) => $q->whereNull('cover_path')->orWhere('cover_path', ''))->get() as $uni) {
            $city = $uni->city;
            $photo = $photos[$city] ?? null;
            if (! $photo) {
                continue;
            }

            $uni->forceFill([
                'cover_path' => $photo['u'],
                'cover_credit' => $photo['a'].', '.$photo['l'].', via Wikimedia Commons',
                'cover_source_url' => $photo['s'],
                'cover_is_city' => true,
            ])->save();
        }
    }

    private function type(?string $type): ?string
    {
        return match (true) {
            $type === null => null,
            (bool) preg_match('/private/i', $type) => 'Private',
            (bool) preg_match('/public|national/i', $type) => 'Public',
            default => null,
        };
    }
}
