<?php

namespace App\Services\Seo;

/**
 * Landing pages for the searches people actually make (BDS in China, MBBS in China for Pakistani students,
 * Chinese language program, ...). The copy lives in database/data/topic_pages.json and carries no fees or
 * dates: those change every year and are shown from the live catalog instead.
 */
class TopicPages
{
    /** @return array<string, array<string, mixed>> keyed by slug */
    public function all(): array
    {
        static $pages = null;
        if ($pages === null) {
            $file = database_path('data/topic_pages.json');
            $rows = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
            $pages = [];
            foreach ($rows as $row) {
                $pages[$row['slug']] = $row;
            }
        }

        return $pages;
    }

    /** @return array<string, mixed>|null */
    public function find(string $slug): ?array
    {
        $page = $this->all()[$slug] ?? null;
        if (! $page) {
            return null;
        }
        $facts = isset($page['facts_terms']) ? app(TopicFacts::class)->for($page['facts_terms']) : null;

        return $page + ['related_links' => $this->related($page), 'facts' => $facts];
    }

    /** @return list<array{title:string, path:string}> */
    public function related(array $page): array
    {
        $links = [];
        foreach ($page['related'] ?? [] as $r) {
            if (str_starts_with($r, '/')) {
                [$path, $label] = array_pad(explode('|', $r, 2), 2, $r);
                $links[] = ['title' => $label, 'path' => $path];
            } elseif (isset($this->all()[$r])) {
                $links[] = ['title' => $this->all()[$r]['h1'], 'path' => '/site/'.$r];
            }
        }

        return $links;
    }

    /** @return list<array{slug:string, title:string, eyebrow:string}> */
    public function index(): array
    {
        return array_values(array_map(fn ($p) => ['slug' => $p['slug'], 'title' => $p['h1'], 'eyebrow' => $p['eyebrow']], $this->all()));
    }
}
