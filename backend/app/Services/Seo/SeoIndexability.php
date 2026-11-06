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
    public static function universityHasSubstance(University $university, int $confirmedPrograms, bool $hasIntakes): bool
    {
        return $university->moe_listed || $university->overview !== null || $confirmedPrograms > 0 || $hasIntakes;
    }
}
