<?php

namespace App\Services\Seo;

use App\Models\Intake;
use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Media\ImageService;
use Illuminate\Support\Str;

/**
 * Builds what a search engine or link preview needs for a public page: title,
 * description, canonical URL, social image, structured data and a plain-HTML
 * body with real text and internal links. The single-page app replaces the
 * body once it loads; crawlers that do not run JavaScript see this content.
 *
 * Public pages never link to official university websites or source URLs.
 */
class SeoPageBuilder
{
    public function __construct(private readonly ImageService $images) {}

    /** @return array<string, mixed> */
    public function build(string $path): array
    {
        $path = trim($path, '/');
        $pages = config('seo.pages');

        if ($path === 'site') {
            return ['redirect' => '/'];
        }

        if (isset($pages[$path])) {
            return $this->staticPage($path, $pages[$path]);
        }

        if (preg_match('#^site/universities/([^/]+)$#', $path, $m)) {
            return $this->university($m[1]) ?? $this->notFound();
        }
        if (preg_match('#^site/cities/([^/]+)$#', $path, $m)) {
            return $this->city($m[1]) ?? $this->notFound();
        }
        if (preg_match('#^site/news/([^/]+)$#', $path, $m)) {
            return $this->post($m[1]) ?? $this->notFound();
        }

        if (str_starts_with($path, 'site/') || $path === 'site') {
            return $this->notFound();
        }

        // Staff app, portals and anything else that is not public: never indexed.
        return $this->page('CAS', null, '/'.$path, noindex: true);
    }

    // ------------------------------------------------------------------ pages

    /** @param array{0:string,1:string,2:float,3:string} $meta */
    private function staticPage(string $path, array $meta): array
    {
        [$title, $description] = $meta;
        $description = $this->withCounts($description);
        $canonical = $path === '' ? '/' : '/'.$path;
        $crumbs = $path === '' ? [] : [['Home', '/'], [$this->crumbLabel($path, $title), $canonical]];

        $body = match ($path) {
            '' => $this->homeBody(),
            'site/universities' => $this->universitiesBody(),
            'site/cities' => $this->citiesBody(),
            'site/mbbs-in-china' => $this->mbbsBody(),
            'site/csc-scholarship' => $this->cscBody(),
            'site/scholarships' => $this->scholarshipsBody(),
            'site/news' => $this->newsBody(),
            default => $this->simpleBody($title, $description),
        };

        $ld = $path === '' ? [$this->organization(), $this->website()] : [];

        return $this->page($title, $description, $canonical, jsonLd: $ld, crumbs: $crumbs, body: $body);
    }

    /** Fills {universities} and {programs} with today's counts, rounded down so the text stays true as data grows. */
    private function withCounts(string $text): string
    {
        if (! str_contains($text, '{')) {
            return $text;
        }

        $counts = cache()->remember('seo.counts.v1', now()->addMinutes(30), fn () => [
            'universities' => University::where('status', 'active')->count(),
            'programs' => Program::where('status', 'active')->where('registry_only', false)->count(),
        ]);
        $round = fn (int $n) => number_format(intdiv($n, $n >= 1000 ? 1000 : 100) * ($n >= 1000 ? 1000 : 100)).'+';

        return strtr($text, ['{universities}' => $round($counts['universities']), '{programs}' => $round($counts['programs'])]);
    }

    private function university(string $slug): ?array
    {
        $u = University::query()->where('slug', $slug)->where('status', 'active')->first();
        if (! $u) {
            return null;
        }

        $canonical = '/site/universities/'.$u->slug;
        $place = collect([$u->city, $u->province])->filter()->unique()->implode(', ');
        $description = $this->clip(trim($u->about ?: ($u->name.' in '.$place.', China: programs, tuition, application windows and scholarships for international students.')), 155);
        $title = $this->fit([$u->name.': Programs, Fees & Application Dates', $u->name.': Programs & Dates', $u->name]);
        $image = $this->absolute($this->images->url($u->cover_path));

        $programs = Program::where('university_id', $u->id)->where('status', 'active')->get(['name', 'level', 'teaching_language', 'tuition_fee']);
        $english = $programs->where('teaching_language', 'English')->whereIn('level', ['bachelor', 'master', 'phd'])->pluck('name')->unique()->sort()->values();
        $intakes = Intake::where('university_id', $u->id)->where(fn ($q) => $q->whereNotNull('application_deadline')->orWhereNotNull('application_open_date'))->orderBy('application_deadline')->get();
        $neighbours = University::where('status', 'active')->where('city', $u->city)->where('id', '!=', $u->id)->orderBy('name')->limit(8)->get(['name', 'slug']);

        $body = '<h1>'.e($u->name).($u->name_zh ? ' ('.e($u->name_zh).')' : '').'</h1>';
        $body .= '<p>'.e($u->about ?: $description).'</p>';
        $facts = array_filter([
            $place ? 'Location: '.$place.', China' : null,
            $u->founded_year ? 'Founded: '.$u->founded_year : null,
            $u->institution_type ? 'Type: '.$u->institution_type : null,
            $u->nearest_airport ? 'Nearest airport: '.$u->nearest_airport : null,
            $u->moe_listed ? 'Approved by the Ministry of Education for English-taught MBBS ('.($u->moe_mbbs_year ?: '2026-27').')' : null,
            $programs->count().' programs for international students',
        ]);
        $body .= $this->ul(array_map('e', $facts));
        if ($intakes->isNotEmpty()) {
            $body .= '<h2>Application windows</h2>'.$this->ul($intakes->map(fn ($i) => e($i->name.($i->application_open_date ? ', opens '.$i->application_open_date->format('j M Y') : '').($i->application_deadline ? ', closes '.$i->application_deadline->format('j M Y') : '')))->all());
        }
        if ($english->isNotEmpty()) {
            $body .= '<h2>English-taught programs</h2>'.$this->ul($english->take(25)->map('e')->all());
        }
        $body .= '<p>'.$this->link('/site/universities', 'All universities in China');
        if ($u->city) {
            $body .= ' · '.$this->link('/site/cities/'.Str::slug($u->city), 'Study in '.$u->city);
        }
        $body .= '</p>';
        if ($neighbours->isNotEmpty()) {
            $body .= '<h2>Other universities in '.e($u->city).'</h2>'.$this->ul($neighbours->map(fn ($n) => $this->link('/site/universities/'.$n->slug, $n->name))->all());
        }

        $ld = [[
            '@context' => 'https://schema.org',
            '@type' => 'CollegeOrUniversity',
            'name' => $u->name,
            'alternateName' => $u->name_zh,
            'url' => $this->abs($canonical),
            'description' => $description,
            'logo' => $this->absolute($this->images->url($u->emblem_path ?: $u->logo_path)),
            'image' => $image,
            'foundingDate' => $u->founded_year ? (string) $u->founded_year : null,
            'address' => array_filter(['@type' => 'PostalAddress', 'addressLocality' => $u->city, 'addressRegion' => $u->province, 'addressCountry' => 'CN']),
            'sameAs' => $u->wikipedia_url ? [$u->wikipedia_url] : null,
        ]];

        return $this->page($title, $description, $canonical, image: $image, jsonLd: array_map(fn ($d) => array_filter($d, fn ($v) => $v !== null && $v !== ''), $ld), crumbs: [['Home', '/'], ['Universities', '/site/universities'], [$u->name, $canonical]], body: $body);
    }

    private function city(string $slug): ?array
    {
        $unis = University::where('status', 'active')->whereNotNull('city')->orderBy('name')->get(['id', 'name', 'slug', 'city', 'province', 'cover_path', 'overview', 'moe_listed']);
        $city = $unis->first(fn ($u) => Str::slug($u->city) === $slug)?->city;
        if (! $city) {
            return null;
        }
        $inCity = $unis->filter(fn ($u) => $u->city === $city)->values();
        $canonical = '/site/cities/'.$slug;

        $intro = '';
        foreach ($inCity as $u) {
            foreach (($u->overview ?? []) as $section) {
                if (($section['h'] ?? '') === 'Studying in '.$city) {
                    $intro = (string) ($section['blocks'][0]['x'] ?? '');
                    break 2;
                }
            }
        }
        $cityText = $this->cityText($inCity->first());

        $description = $this->clip('Study in '.$city.': '.$inCity->count().' universit'.($inCity->count() === 1 ? 'y' : 'ies').' for international students, '.($inCity->where('moe_listed', true)->count() ? $inCity->where('moe_listed', true)->count().' approved for English-taught MBBS, ' : '').'with programs, tuition and application windows.', 155);
        $title = $this->fit(['Study in '.$city.': Universities, Programs & Dates', 'Study in '.$city.': Universities & Programs']);
        $image = $this->absolute($this->images->url($inCity->first(fn ($u) => filled($u->cover_path))?->cover_path));

        $body = '<h1>Study in '.e($city).'</h1><p>'.e($intro ?: $description).'</p>'.$cityText;
        $body .= '<h2>Universities in '.e($city).'</h2>'.$this->ul($inCity->map(fn ($u) => $this->link('/site/universities/'.$u->slug, $u->name).($u->moe_listed ? ' (MoE-approved for English MBBS)' : ''))->all());
        $body .= '<p>'.$this->link('/site/cities', 'All cities').'</p>';

        return $this->page($title, $description, $canonical, image: $image, crumbs: [['Home', '/'], ['Cities', '/site/cities'], [$city, $canonical]], body: $body);
    }

    private function post(string $slug): ?array
    {
        $post = Post::query()->where('slug', $slug)->where('status', 'published')->first();
        if (! $post) {
            return null;
        }
        $canonical = '/site/news/'.$post->slug;
        $description = $this->clip($post->excerpt ?: strip_tags((string) $post->body), 155);
        $image = $this->absolute($this->images->url($post->cover_image_path));
        $body = '<h1>'.e($post->title).'</h1><p>'.e($post->excerpt).'</p><div>'.strip_tags((string) $post->body, '<p><strong><em><ul><ol><li><h2><h3><br>').'</div><p>'.$this->link('/site/news', 'More news').'</p>';
        $ld = [[
            '@context' => 'https://schema.org',
            '@type' => 'NewsArticle',
            'headline' => $post->title,
            'description' => $description,
            'image' => $image,
            'datePublished' => $post->published_at?->toIso8601String(),
            'dateModified' => $post->updated_at?->toIso8601String(),
            'mainEntityOfPage' => $this->abs($canonical),
            'author' => ['@type' => 'Organization', 'name' => config('seo.site_name')],
            'publisher' => ['@type' => 'Organization', 'name' => config('seo.site_name'), 'logo' => ['@type' => 'ImageObject', 'url' => $this->abs('/cas-logo-copy.png')]],
        ]];

        return $this->page($this->fit([$post->title]), $description, $canonical, image: $image, jsonLd: $ld, crumbs: [['Home', '/'], ['News', '/site/news'], [$post->title, $canonical]], body: $body, type: 'article');
    }

    private function notFound(): array
    {
        return $this->page('Page not found', 'This page does not exist.', '/', noindex: true, status: 404, body: '<h1>Page not found</h1><p>This page does not exist. '.$this->link('/', 'Go to the homepage').'</p>');
    }

    // ----------------------------------------------------------------- bodies

    private function homeBody(): string
    {
        $featured = University::where('status', 'active')->where('moe_listed', true)->orderBy('name')->limit(12)->get(['name', 'slug']);

        return '<h1>Study in China</h1>'
            .'<p>CAS — Consultancy for Abroad Study — has guided international students into Chinese universities since 2012. Search '.University::where('status', 'active')->count().' universities and '.number_format(Program::where('status', 'active')->count()).' programs, see application windows, and apply with a CAS counselor.</p>'
            .'<ul>'
            .'<li>'.$this->link('/site/mbbs-in-china', 'MBBS in China: approved universities, fees and dates').'</li>'
            .'<li>'.$this->link('/site/scholarships', 'Scholarships for international students').'</li>'
            .'<li>'.$this->link('/site/csc-scholarship', 'CSC scholarship guide').'</li>'
            .'<li>'.$this->link('/site/universities', 'Universities in China').'</li>'
            .'<li>'.$this->link('/site/programs', 'Find a program').'</li>'
            .'<li>'.$this->link('/site/cities', 'Study in China by city').'</li>'
            .'</ul>'
            .'<h2>Ministry of Education–approved MBBS universities</h2>'
            .$this->ul($featured->map(fn ($u) => $this->link('/site/universities/'.$u->slug, $u->name))->all());
    }

    private function universitiesBody(): string
    {
        $rows = University::where('status', 'active')->orderBy('name')->get(['name', 'slug', 'city', 'name_zh']);

        return '<h1>Universities in China for international students</h1><p>'.$rows->count().' universities with programs, tuition, application windows and scholarships.</p>'
            .$this->ul($rows->map(fn ($u) => $this->link('/site/universities/'.$u->slug, $u->name).($u->city ? ', '.e($u->city) : ''))->all());
    }

    private function citiesBody(): string
    {
        $cities = University::where('status', 'active')->whereNotNull('city')->get(['city'])->groupBy('city')->map->count()->sortDesc();

        return '<h1>Study in China by city</h1><p>Pick a city to see its universities, climate, transport and student life.</p>'
            .$this->ul($cities->map(fn ($n, $c) => $this->link('/site/cities/'.Str::slug($c), $c).' ('.$n.' universities)')->all());
    }

    private function mbbsBody(): string
    {
        $rows = University::where('status', 'active')->where('moe_listed', true)->orderBy('name')->get(['name', 'slug', 'city']);

        return '<h1>MBBS in China</h1>'
            .'<p>China\'s Ministry of Education publishes an annual list of universities approved to enrol international students in English-taught MBBS (Clinical Medicine). For 2026–27 the list has '.$rows->count().' universities. Universities that are not on the list may not recruit English-taught MBBS students, so check the list before you apply.</p>'
            .'<h2>Approved universities</h2>'
            .$this->ul($rows->map(fn ($u) => $this->link('/site/universities/'.$u->slug, $u->name).', '.e($u->city))->all())
            .'<p>'.$this->link('/site/study-plan', 'Get a free study plan').' · '.$this->link('/site/contact', 'Talk to a counselor').'</p>';
    }

    private function cscBody(): string
    {
        $gov = Scholarship::where('scope', 'government')->where('status', 'active')->orderBy('name')->get(['name', 'coverage']);

        return '<h1>CSC Scholarship: the Chinese Government Scholarship</h1>'
            .'<p>The Chinese Government Scholarship (CSC) funds international students at Chinese universities. Awards are applied for online through the CSC Study in China system, usually through the Chinese embassy in your country or through a host university, and the opening date and deadline depend on the route.</p>'
            .'<h2>China-wide scholarships</h2>'
            .$this->ul($gov->map(fn ($s) => e($s->name).($s->coverage ? ': '.e($s->coverage) : ''))->all())
            .'<p>'.$this->link('/site/scholarships', 'All scholarships').' · '.$this->link('/site/programs', 'Find CSC-listed programs').'</p>';
    }

    private function scholarshipsBody(): string
    {
        $rows = Scholarship::where('status', 'active')->orderBy('name')->get(['name', 'coverage']);

        return '<h1>Scholarships to study in China</h1><p>Chinese Government (CSC), provincial and university scholarships for international students.</p>'
            .$this->ul($rows->map(fn ($s) => e($s->name).($s->coverage ? ': '.e($s->coverage) : ''))->all());
    }

    private function newsBody(): string
    {
        $rows = Post::where('status', 'published')->orderByDesc('published_at')->limit(30)->get(['title', 'slug', 'excerpt']);

        return '<h1>News and updates on studying in China</h1>'.$this->ul($rows->map(fn ($p) => $this->link('/site/news/'.$p->slug, $p->title).' — '.e($p->excerpt))->all());
    }

    private function simpleBody(string $title, string $description): string
    {
        return '<h1>'.e($title).'</h1><p>'.e($description).'</p><p>'.$this->link('/', 'Home').' · '.$this->link('/site/universities', 'Universities').' · '.$this->link('/site/programs', 'Programs').'</p>';
    }

    private function cityText(?University $u): string
    {
        if (! $u) {
            return '';
        }
        $html = '';
        foreach (($u->overview ?? []) as $section) {
            if (! in_array($section['h'] ?? '', ['Geography', 'Climate', 'Economy', 'Culture', 'Transport', 'Transportation'], true) || ! ($section['blocks'] ?? [])) {
                continue;
            }
            $html .= '<h2>'.e($section['h']).'</h2>';
            foreach (array_slice($section['blocks'], 0, 3) as $b) {
                if ($b['t'] === 'p') {
                    $html .= '<p>'.e($b['x']).'</p>';
                }
            }
        }

        return $html;
    }

    // ---------------------------------------------------------------- shared

    /**
     * @param  list<array<string, mixed>>  $jsonLd
     * @param  list<array{0:string,1:string}>  $crumbs
     * @return array<string, mixed>
     */
    private function page(string $title, ?string $description, string $canonical, ?string $image = null, array $jsonLd = [], array $crumbs = [], string $body = '', bool $noindex = false, int $status = 200, string $type = 'website'): array
    {
        if ($crumbs) {
            $jsonLd[] = [
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => array_map(fn ($c, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => $this->abs($c[1])], $crumbs, array_keys($crumbs)),
            ];
        }

        return [
            'status' => $status,
            'title' => $title === 'CAS' || $noindex ? $title : $title.' | CAS',
            'description' => $description,
            'canonical' => $this->abs($canonical),
            'image' => $image ?: $this->abs(config('seo.default_image')),
            'noindex' => $noindex,
            'type' => $type,
            'jsonLd' => $jsonLd,
            'body' => $body,
        ];
    }

    /** @return array<string, mixed> */
    private function organization(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'EducationalOrganization',
            'name' => config('seo.site_name'),
            'alternateName' => 'CAS',
            'url' => $this->abs('/'),
            'logo' => $this->abs('/cas-logo-copy.png'),
            'foundingDate' => '2012',
            'description' => 'Authorized agent placing international students into Chinese universities.',
            'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'Dalian', 'addressRegion' => 'Liaoning', 'addressCountry' => 'CN'],
        ];
    }

    /** @return array<string, mixed> */
    private function website(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('seo.site_name'),
            'url' => $this->abs('/'),
            'potentialAction' => ['@type' => 'SearchAction', 'target' => $this->abs('/site/universities').'?q={search_term_string}', 'query-input' => 'required name=search_term_string'],
        ];
    }

    private function abs(string $path): string
    {
        return config('seo.site_url').($path === '/' ? '/' : $path);
    }

    private function absolute(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        return preg_match('#^https?://#i', $url) ? $url : config('seo.site_url').$url;
    }

    /** @param list<string> $options first option that fits 60 characters (with " | CAS") wins */
    private function fit(array $options): string
    {
        foreach ($options as $o) {
            if (mb_strlen($o) <= 54) {
                return $o;
            }
        }

        return $this->clip(end($options), 54);
    }

    private function clip(string $text, int $max): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)));

        return mb_strlen($text) <= $max ? $text : rtrim(mb_substr($text, 0, $max - 1), ' ,.;:-').'…';
    }

    private function crumbLabel(string $path, string $title): string
    {
        return ucwords(str_replace(['site/', '-'], ['', ' '], $path));
    }

    private function link(string $href, string $label): string
    {
        return '<a href="'.e($href).'">'.e($label).'</a>';
    }

    /** @param list<string> $items already-escaped HTML */
    private function ul(array $items): string
    {
        return '<ul>'.implode('', array_map(fn ($i) => '<li>'.$i.'</li>', $items)).'</ul>';
    }
}
