<?php

namespace App\Observers;

use App\Models\Post;
use App\Models\University;
use App\Services\Seo\IndexNow;
use Illuminate\Database\Eloquent\Model;

/**
 * When a university or a news post is added, changed or published from the admin, its public URL
 * (and the news list) is sent to the IndexNow search engines right after the response. Seeding and
 * other console runs do not ping, so a bulk import never floods them.
 */
class SeoPingObserver
{
    private const WATCHED = ['name', 'slug', 'about', 'overview', 'status', 'cover_path', 'title', 'body', 'excerpt', 'published_at', 'city', 'province'];

    public function saved(Model $model): void
    {
        if ((app()->runningInConsole() && ! config('seo.ping_from_console')) || (! $model->wasRecentlyCreated && ! $model->wasChanged(self::WATCHED))) {
            return;
        }

        $paths = match (true) {
            $model instanceof University && $model->status === 'active' => ['/site/universities/'.$model->slug, '/sitemap.xml'],
            $model instanceof Post && $model->status === 'published' => ['/site/news/'.$model->slug, '/site/news', '/sitemap.xml'],
            default => [],
        };

        if ($paths !== []) {
            defer(fn () => app(IndexNow::class)->submit($paths));
        }
    }
}
