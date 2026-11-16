<?php

namespace App\Console\Commands;

use App\Models\University;
use App\Services\Media\Thumbnails;
use Illuminate\Console\Command;

class MakeThumbnails extends Command
{
    protected $signature = 'catalog:make-thumbs {--force : remake copies that already exist}';

    protected $description = 'Make small (480 px) copies of university cover photos for lists of cards';

    public function handle(Thumbnails $thumbs): int
    {
        $made = $skipped = $failed = 0;

        University::query()->whereNotNull('cover_path')->where('cover_path', 'like', '/photos/%')->orderBy('id')
            ->chunkById(200, function ($rows) use ($thumbs, &$made, &$skipped, &$failed) {
                foreach ($rows as $u) {
                    if (! $this->option('force') && $thumbs->urlFor($u->cover_path)) {
                        $skipped++;

                        continue;
                    }
                    $thumbs->make($u->cover_path) ? $made++ : $failed++;
                }
            });

        $this->info("Made {$made}, already there {$skipped}, could not make {$failed}.");

        return self::SUCCESS;
    }
}
