<?php

namespace App\Support;

use Closure;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams an Eloquent query as a CSV download, chunked to stay memory-safe and
 * hard-capped so an export can never run away. Reuses the caller's already
 * filtered + RBAC-scoped query, so exports never leak beyond what the list shows.
 */
class CsvExport
{
    public const MAX_ROWS = 10000;

    /**
     * @param  array<int, string>  $headers
     * @param  Closure(mixed): array<int, mixed>  $mapRow
     */
    public static function stream(string $filename, Builder $query, array $headers, Closure $mapRow): StreamedResponse
    {
        return response()->streamDownload(function () use ($query, $headers, $mapRow) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel reads non-ASCII correctly
            fputcsv($out, $headers);

            $written = 0;
            $query->chunkById(500, function ($rows) use ($out, $mapRow, &$written) {
                foreach ($rows as $row) {
                    fputcsv($out, array_map(fn ($v) => $v ?? '', $mapRow($row)));
                    $written++;
                }

                return $written < self::MAX_ROWS; // stop once the cap is reached
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
