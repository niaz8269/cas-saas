<?php

namespace App\Services\Content;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer as SymfonyHtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * Cleans WYSIWYG post HTML before it is stored — the body is authored by staff
 * but rendered on the public site, so we strip scripts, event handlers and
 * unsafe URLs, keeping only a curated set of formatting elements.
 */
class HtmlSanitizer
{
    private readonly SymfonyHtmlSanitizer $sanitizer;

    public function __construct()
    {
        $config = (new HtmlSanitizerConfig())
            ->allowSafeElements()               // headings, p, lists, a, strong/em, blockquote, code, pre, img, tables…
            ->allowRelativeLinks()
            ->allowLinkSchemes(['https', 'http', 'mailto'])
            ->allowMediaSchemes(['https', 'data'])
            ->withMaxInputLength(200_000);

        $this->sanitizer = new SymfonyHtmlSanitizer($config);
    }

    public function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        return $this->sanitizer->sanitize($html);
    }
}
