<?php

namespace App\Support;

/**
 * Public pages name where a date or fact came from but never link to it
 * (official links live in the admin portal). This turns a stored source URL
 * into the label the public site shows.
 */
class SourceKind
{
    public static function of(?string $url): ?string
    {
        return match (true) {
            blank($url) => null,
            (bool) preg_match('#//([^/]*\.)?cucas\.#i', $url) => 'cucas',
            (bool) preg_match('#//([^/]*\.)?sas\.cas\.moe#i', $url) => 'sas',
            (bool) preg_match('#//[^/]*\.(edu|gov)\.cn(/|$)#i', $url) => 'official',
            default => 'listing',
        };
    }
}
