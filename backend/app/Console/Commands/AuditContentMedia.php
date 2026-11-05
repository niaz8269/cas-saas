<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Program;
use App\Models\University;
use App\Services\Media\BrandedDownload;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Internal content and media audit (never published). Writes two CSV files to
 * storage/app/audits: every media asset with its source, licence and status, and
 * every kind of text with its origin and what CAS must do with it.
 *
 * Media status: own (CAS-created), usable (public domain / CC0), attribution
 * (reusable with the credit kept), permission (needs the owner's permission),
 * verify (source not recorded), replace (cannot be reused: original needed).
 */
class AuditContentMedia extends Command
{
    protected $signature = 'cas:audit-content';

    protected $description = 'Write the internal content and media audit (CSV)';

    public function handle(BrandedDownload $downloads): int
    {
        $dir = storage_path('app/audits');
        File::ensureDirectoryExists($dir);

        $media = fopen($dir.'/media-audit.csv', 'w');
        fputcsv($media, ['kind', 'path', 'used_by', 'source', 'licence', 'attribution_required', 'status', 'branded_download', 'action']);

        // Cover photos: one row per file, with the credit recorded when it was added.
        $covers = University::whereNotNull('cover_path')->where('cover_path', '!=', '')
            ->get(['id', 'cover_path', 'cover_credit', 'cover_source_url', 'cover_is_city', 'slug'])
            ->groupBy('cover_path');
        foreach ($covers as $path => $group) {
            $first = $group->first();
            $licence = $downloads->licence($first->cover_credit);
            $credit = (string) $first->cover_credit;
            $status = match (true) {
                $licence !== null && preg_match('/CC0|Public domain/i', $licence) === 1 => 'usable',
                $licence !== null => 'attribution',
                $credit === '' => 'verify',
                default => 'permission',
            };
            fputcsv($media, [
                $first->cover_is_city ? 'city photo' : 'campus photo', $path, $group->count().' institutions',
                $first->cover_source_url ?: ($credit !== '' ? 'Wikimedia Commons (see credit)' : 'not recorded'), $licence ?? 'not permitted or not recorded',
                $status === 'usable' ? 'no' : 'yes: '.$credit, $status,
                $status === 'usable' || $status === 'attribution' ? 'yes' : 'no',
                match ($status) {
                    'attribution' => 'Keep credit on Photo credits page; shown clean on pages',
                    'usable' => 'None',
                    'verify' => 'Identify the source, then keep or replace with an original',
                    default => 'Ask for permission or replace with an original image',
                },
            ]);
        }

        // Logos and emblems: the universities' own marks, shown to identify them.
        foreach (['logo_path' => 'university logo', 'emblem_path' => 'university emblem'] as $column => $kind) {
            $count = University::whereNotNull($column)->where($column, '!=', '')->count();
            fputcsv($media, [$kind, "(all {$column} values)", "{$count} institutions", 'Wikimedia Commons / Wikidata, or the university\'s own website', 'trademark of each university; file licence varies', 'yes (name of the university)', 'permission', 'no', 'Kept for identification only. Request written permission per university; never place a CAS watermark on them; no download route']);
        }

        // Static site assets.
        foreach ([
            ['hero image', '/src/assets/hero-graduate*.webp', 'Home hero', 'source not recorded', 'unknown', 'unknown', 'verify', 'no', 'Owner to confirm the source or licence; otherwise commission or create an original CAS-designed hero'],
            ['header image', '/images/hero-great-wall.webp', 'Default page header', 'source not recorded', 'unknown', 'unknown', 'verify', 'no', 'Same as the home hero'],
            ['artwork', '/images/art-1..6.svg', 'Cards', 'CAS original geometric artwork', 'CAS-owned', 'no', 'own', 'yes', 'None'],
            ['brand', '/cas-logo, /cas-emblem, favicon, og-image', 'Site chrome', 'CAS', 'CAS-owned', 'no', 'own', 'yes', 'None'],
            ['QR code', '/images/wechat-qr-v2.jpg', 'Contact', 'CAS WeChat account', 'CAS-owned', 'no', 'own', 'no', 'None'],
        ] as $row) {
            fputcsv($media, $row);
        }
        fclose($media);

        // Text content.
        $withWikipedia = University::whereNotNull('wikipedia_url')->count();
        $overviews = University::whereNotNull('overview')->count();
        $text = fopen($dir.'/content-audit.csv', 'w');
        fputcsv($text, ['content', 'count', 'origin', 'category', 'action']);
        foreach ([
            ['University overviews (history, city, culture)', $overviews, 'English Wikipedia article text of the university and its city (CC BY-SA 4.0), joined with CAS catalog data', 'third-party text: rewrite', 'Rewrite in CAS voice from the facts; keep attribution until the rewrite replaces it'],
            ['University introductions (about)', University::whereNotNull('about')->count(), 'Wikipedia lead where one existed, else a CAS-written factual line from catalog data', 'mixed', 'Rewrite the Wikipedia-derived ones; the CAS lines are original'],
            ['University profile facts (founded, type, students)', $withWikipedia, 'Wikipedia and Wikidata facts (facts are not copyrightable)', 'official third-party factual information', 'Keep'],
            ['University names, cities, MoE codes', University::count(), 'Ministry of Education national list (public information)', 'official third-party factual information', 'Keep; cite the source in the admin'],
            ['Registered majors', Program::where('registry_only', true)->count(), 'Ministry of Education filing results (public information)', 'official third-party factual information', 'Keep; names translated by CAS'],
            ['Programs, fees, dates, scholarships', Program::where('registry_only', false)->count(), 'Each university\'s own admissions pages, restated by CAS', 'rewritten CAS editorial content', 'Keep'],
            ['News and blog posts', Post::count(), 'Written by CAS', 'original CAS-created', 'Keep'],
            ['Site pages (about, pricing, guides, FAQ)', 0, 'Written by CAS', 'original CAS-created', 'Keep'],
        ] as $row) {
            fputcsv($text, $row);
        }
        fclose($text);

        $this->info('Audit written to '.$dir);

        return self::SUCCESS;
    }
}
