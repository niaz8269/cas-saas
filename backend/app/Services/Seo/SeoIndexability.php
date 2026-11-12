<?php

namespace App\Services\Seo;

use App\Models\University;

/**
 * Decides whether a university page is worth showing in search results. Search engines judge a site by
 * the share of useful pages, so a page with nothing but a name, a city and the Ministry's registered
 * majors stays out (noindex, and left out of the sitemap) until it has real content: confirmed programs,
 * published application windows, a researched profile, or approval for English-taught MBBS. The moment
 * any of those is added in the admin, the page switches on by itself.
 */
class SeoIndexability
{
    /** @var list<string>|null */
    private static ?array $cities = null;

    /**
     * Cities where at least one university has substance. A city page that only links to pages kept out of
     * search results adds nothing of its own, so it stays out too until one of its universities qualifies.
     *
     * @return list<string>
     */
    public static function substantiveCities(): array
    {
        if (self::$cities !== null && ! app()->environment('testing')) {
            return self::$cities;
        }

        $rows = University::where('status', 'active')->whereNotNull('city')
            ->withCount(['programs as confirmed_programs_count' => fn ($q) => $q->where('status', 'active')->where('registry_only', false)])
            ->withExists('intakes as has_intakes')
            ->get(['id', 'city', 'overview', 'moe_listed']);

        return self::$cities = $rows
            ->filter(fn ($u) => self::universityHasSubstance($u, (int) $u->confirmed_programs_count, (bool) $u->has_intakes))
            ->pluck('city')->unique()->values()->all();
    }

    public static function cityHasSubstance(string $city): bool
    {
        return in_array($city, self::substantiveCities(), true);
    }

    public static function universityHasSubstance(University $university, int $confirmedPrograms, bool $hasIntakes): bool
    {
        return $university->moe_listed || $university->overview !== null || $confirmedPrograms > 0 || $hasIntakes;
    }
}
