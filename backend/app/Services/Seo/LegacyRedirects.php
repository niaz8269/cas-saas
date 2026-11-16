<?php

namespace App\Services\Seo;

use App\Models\University;

/**
 * Where an address from the previous version of the website now lives. Search engines still know those
 * addresses; answering with a permanent redirect hands their standing to the matching page here instead of
 * leaving a dead end.
 */
class LegacyRedirects
{
    /** @return string|null the new path, or null when this is not an old address */
    public function target(string $path): ?string
    {
        $path = '/'.trim($path, '/');

        if ($path === '/services') {
            return '/site/services';
        }
        if ($path === '/auth/login.php') {
            return '/portal/login';
        }
        if ($path === '/auth/register.php') {
            return '/portal/register';
        }
        // Old program and study pages have no one-to-one page now: the program finder is the nearest match.
        if (preg_match('#^/(programs|study)(/.*)?$#', $path)) {
            return '/site/programs';
        }
        if (preg_match('#^/universities/([^/]+)$#', $path, $m)) {
            return $this->universityOr($m[1], '/site/universities');
        }
        // The old MBBS site: one page per college, ending in .html.
        if (preg_match('#^/([a-z0-9-]+)\.html$#i', $path, $m)) {
            return $this->universityOr($m[1], '/site/mbbs-in-china');
        }

        return null;
    }

    private function universityOr(string $slug, string $fallback): string
    {
        $slug = strtolower($slug);

        return University::where('status', 'active')->where('slug', $slug)->exists() ? '/site/universities/'.$slug : $fallback;
    }
}
