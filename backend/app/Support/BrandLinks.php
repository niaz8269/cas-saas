<?php

namespace App\Support;

use DOMDocument;
use DOMNode;
use DOMText;

/**
 * Turns every mention of a partner brand in a piece of HTML into a link to its own site
 * (config seo.brand_links, e.g. "Dalian Medical University" -> https://dmu.cas.moe).
 *
 * Only plain text is touched: words already inside a link, a heading, a button, a script or a style are left
 * alone, so no link is nested in another and no heading changes.
 */
class BrandLinks
{
    private const SKIP = ['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'script', 'style', 'title', 'textarea', 'option', 'select', 'noscript'];

    public static function apply(string $html): string
    {
        $links = (array) config('seo.brand_links', []);
        if ($html === '' || $links === []) {
            return $html;
        }

        $pattern = '/'.implode('|', array_map(fn ($name) => preg_quote((string) $name, '/'), array_keys($links))).'/u';
        if (! preg_match($pattern, $html)) {
            return $html;
        }

        $doc = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="brand-links-root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementById('brand-links-root');
        if (! $root) {
            return $html;
        }

        self::walk($root, $doc, $pattern, $links);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return $out;
    }

    /** @param array<string, string> $links */
    private static function walk(DOMNode $node, DOMDocument $doc, string $pattern, array $links): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMText) {
                self::linkText($child, $doc, $pattern, $links);
            } elseif ($child->nodeType === XML_ELEMENT_NODE && ! in_array(strtolower($child->nodeName), self::SKIP, true)) {
                self::walk($child, $doc, $pattern, $links);
            }
        }
    }

    /** @param array<string, string> $links */
    private static function linkText(DOMText $text, DOMDocument $doc, string $pattern, array $links): void
    {
        $parts = preg_split('/('.substr($pattern, 1, -2).')/u', $text->data, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        if (! $parts || count($parts) < 2 && ! isset($links[$parts[0] ?? ''])) {
            return;
        }

        $fragment = $doc->createDocumentFragment();
        foreach ($parts as $part) {
            if (isset($links[$part])) {
                $a = $doc->createElement('a');
                $a->setAttribute('href', $links[$part]);
                $a->setAttribute('target', '_blank');
                $a->setAttribute('rel', 'noopener');
                $a->appendChild($doc->createTextNode($part));
                $fragment->appendChild($a);
            } else {
                $fragment->appendChild($doc->createTextNode($part));
            }
        }
        $text->parentNode?->replaceChild($fragment, $text);
    }
}
