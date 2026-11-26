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
    /** @var array<string, string> old address => where it lives now */
    private const MOVED = [
        '/services' => '/site/services',
        '/about' => '/site/about',
        '/about-us' => '/site/about',
        '/contact' => '/site/contact',
        '/contact-us' => '/site/contact',
        '/faq' => '/site/faq',
        '/pricing' => '/site/pricing',
        '/partner' => '/site/partner',
        '/terms' => '/site/terms',
        '/refund-policy' => '/site/terms',
        '/privacy' => '/site/privacy',
        '/privacy-policy' => '/site/privacy',
        '/news' => '/site/news',
        '/blog' => '/site/news',
        '/cities' => '/site/cities',
        '/why-china' => '/site/why-china',
    ];

    /** @return string|null the new path, or null when this is not an old address */
    public function target(string $path): ?string
    {
        $path = '/'.trim($path, '/');

        // Pages that kept their name and moved under /site.
        if (isset(self::MOVED[$path])) {
            return self::MOVED[$path];
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
        // Old scholarship and service pages: the list they belonged to. (/scholarships itself is a staff screen.)
        if (preg_match('#^/scholarships/.+$#', $path)) {
            return '/site/scholarships';
        }
        if (preg_match('#^/services/.+$#', $path)) {
            return '/site/services';
        }
        // A number is a record in the staff app (/universities/12), not an old public address.
        if (preg_match('#^/universities/([^/]+)$#', $path, $m) && ! ctype_digit($m[1])) {
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
