<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use App\Models\ApiSource;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class MintApiKey extends Command
{
    protected $signature = 'cas:api-key
        {name : API source name (created if missing)}
        {--type=website : Source type (website|agent|campaign|manual)}
        {--url= : Website URL for the source}
        {--rate=60 : Requests per minute for this key}';

    protected $description = 'Create an ingestion API key for a source (plain key is shown once)';

    public function handle(): int
    {
        $source = ApiSource::firstOrCreate(
            ['name' => $this->argument('name')],
            [
                'type' => $this->option('type'),
                'website_url' => $this->option('url'),
                'is_active' => true,
            ],
        );

        $plainKey = 'cas_'.Str::random(40);

        $source->apiKeys()->create([
            'key_hash' => ApiKey::hashKey($plainKey),
            'rate_limit' => (int) $this->option('rate'),
        ]);

        $this->info("Source: {$source->name} (id {$source->id})");
        $this->warn('Store this key now — it cannot be recovered:');
        $this->line($plainKey);

        return self::SUCCESS;
    }
}
