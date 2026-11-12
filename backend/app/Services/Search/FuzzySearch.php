<?php

namespace App\Services\Search;

use Closure;
use Illuminate\Support\Str;

/**
 * Typo-tolerant search for the public site. A search that finds nothing is retried with the visitor's
 * misspelled words replaced by the closest real words in the catalog ("herbin" finds "Harbin", "enginering"
 * finds "Engineering", "unversity" finds "University").
 *
 * The word list is built from the names the search itself looks at (university names, cities, program names,
 * scholarship names, news titles) and kept in the cache, so a correction is only ever a word that exists on the
 * site. Words that already match something (including the start of a longer word, as when someone is still
 * typing) are never changed.
 */
class FuzzySearch
{
    /** Longest edit distance accepted, by word length: short words may differ by one letter, longer ones by two. */
    private const SHORT_WORD = 5;

    private const MIN_LENGTH = 4;

    private const MAX_CANDIDATES = 3;

    private const MAX_VARIANTS = 4;

    /**
     * Corrected spellings of the query, best first. Empty when nothing needs correcting or nothing close exists.
     *
     * @param  Closure(): iterable<string>  $phrases  Every name the search looks at; only called when the cached word list is missing.
     * @return list<string>
     */
    public function corrections(string $domain, string $query, Closure $phrases): array
    {
        $tokens = $this->tokens($query);
        if ($tokens === []) {
            return [];
        }

        $vocabulary = $this->vocabulary($domain, $phrases);

        // For every word: either itself (it is fine) or its closest real words.
        $options = [];
        $changed = false;
        foreach ($tokens as $token) {
            $candidates = $this->candidates($token, $vocabulary);
            if ($candidates === null) {
                $options[] = [$token];
            } else {
                $options[] = $candidates === [] ? [$token] : $candidates;
                $changed = $changed || $candidates !== [];
            }
        }

        if (! $changed) {
            return [];
        }

        // Best guess for every word, then the runners-up for the first word that was corrected.
        $best = array_map(fn ($o) => $o[0], $options);
        $variants = [implode(' ', $best)];

        foreach ($options as $i => $choices) {
            if (count($choices) > 1) {
                foreach (array_slice($choices, 1) as $alternative) {
                    $copy = $best;
                    $copy[$i] = $alternative;
                    $variants[] = implode(' ', $copy);
                }
                break;
            }
        }

        $original = mb_strtolower(trim($query));

        return array_slice(array_values(array_filter(array_unique($variants), fn ($v) => $v !== $original)), 0, self::MAX_VARIANTS);
    }

    /**
     * The words of the query in plain lowercase letters and digits.
     *
     * @return list<string>
     */
    private function tokens(string $query): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower(trim($query)), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_slice($words, 0, 6));
    }

    /**
     * null when the word is fine as it is; otherwise the closest real words (empty when none is close enough).
     *
     * @param  array<string, int>  $vocabulary  word => how many names contain it
     * @return list<string>|null
     */
    private function candidates(string $token, array $vocabulary): ?array
    {
        $length = mb_strlen($token);
        $plain = Str::ascii($token);

        // Short words, numbers and anything already on the site (or the start of a longer word) stay as typed.
        if ($length < self::MIN_LENGTH || ctype_digit($plain) || isset($vocabulary[$plain])) {
            return null;
        }
        foreach ($vocabulary as $word => $_) {
            if (str_starts_with((string) $word, $plain)) {
                return null;
            }
        }

        $max = $length <= self::SHORT_WORD ? 1 : 2;
        $scored = [];

        foreach ($vocabulary as $word => $count) {
            $word = (string) $word;
            if (abs(strlen($word) - strlen($plain)) > $max) {
                continue;
            }

            $distance = levenshtein($plain, $word);
            // Two letters swapped ("mdeical") is one slip of the finger, not two.
            if ($distance === 2 && strlen($word) === strlen($plain) && $this->isSwap($plain, $word)) {
                $distance = 1;
            }
            if ($distance <= $max) {
                $scored[] = [$distance, -$count, $word];
            }
        }

        usort($scored, fn ($a, $b) => $a <=> $b);

        return array_values(array_map(fn ($s) => $s[2], array_slice($scored, 0, self::MAX_CANDIDATES)));
    }

    private function isSwap(string $a, string $b): bool
    {
        $diff = [];
        for ($i = 0, $n = strlen($a); $i < $n; $i++) {
            if ($a[$i] !== $b[$i]) {
                $diff[] = $i;
            }
        }

        return count($diff) === 2 && $diff[1] === $diff[0] + 1 && $a[$diff[0]] === $b[$diff[1]] && $a[$diff[1]] === $b[$diff[0]];
    }

    /**
     * Every word of the searchable names, with how many names use it. Cached for six hours.
     *
     * @param  Closure(): iterable<string>  $phrases
     * @return array<string, int>
     */
    private function vocabulary(string $domain, Closure $phrases): array
    {
        return cache()->remember('search.vocabulary.v1.'.$domain, now()->addHours(6), function () use ($phrases) {
            $words = [];
            foreach ($phrases() as $phrase) {
                $seen = [];
                foreach (preg_split('/[^a-z0-9]+/', Str::lower(Str::ascii((string) $phrase)), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
                    if (strlen($word) >= self::MIN_LENGTH && ! isset($seen[$word])) {
                        $seen[$word] = true;
                        $words[$word] = ($words[$word] ?? 0) + 1;
                    }
                }
            }

            return $words;
        });
    }
}
