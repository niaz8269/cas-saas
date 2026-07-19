<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use App\Models\ApiSource;
use App\Models\Program;
use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MintApiKey extends Command
{
    protected $signature = 'cas:api-key
        {name : API source name (created if missing)}
        {--type=website : Source type (website|agent|campaign|manual)}
        {--url= : Website URL for the source}
        {--rate=60 : Requests per minute for this key}
        {--university= : University id to bind the source to (for application ingestion)}
        {--program= : Default program id for ingested applications}';

    protected $description = 'Create an ingestion API key for a source (plain key is shown once)';

    public function handle(): int
    {
        $universityId = $this->resolveId('university', University::class);
        $programId = $this->resolveId('program', Program::class);

        if ($universityId === false || $programId === false) {
            return self::FAILURE;
        }

        // A default program implies its university, so keep the two consistent.
        if ($programId !== null && $universityId === null) {
            $universityId = Program::whereKey($programId)->value('university_id');
        }

        $source = ApiSource::firstOrCreate(
            ['name' => $this->argument('name')],
            [
                'type' => $this->option('type'),
                'website_url' => $this->option('url'),
                'is_active' => true,
            ],
        );

        $source->fill(array_filter([
            'university_id' => $universityId,
            'default_program_id' => $programId,
        ], fn ($v) => $v !== null))->save();

        $plainKey = 'cas_'.Str::random(40);

        $source->apiKeys()->create([
            'key_hash' => ApiKey::hashKey($plainKey),
            'rate_limit' => (int) $this->option('rate'),
        ]);

        $this->info("Source: {$source->name} (id {$source->id})");
        if ($source->university_id) {
            $this->info("Bound to university {$source->university_id}"
                .($source->default_program_id ? ", default program {$source->default_program_id}" : ''));
        }
        $this->warn('Store this key now — it cannot be recovered:');
        $this->line($plainKey);

        return self::SUCCESS;
    }

    /**
     * Resolve a numeric id option, verifying the record exists.
     *
     * @param  class-string<Model>  $model
     * @return int|null|false the id, null if the option was omitted, false if invalid
     */
    private function resolveId(string $option, string $model): int|null|false
    {
        $value = $this->option($option);

        if ($value === null || $value === '') {
            return null;
        }

        if (! $model::whereKey($value)->exists()) {
            $this->error(ucfirst($option)." {$value} not found.");

            return false;
        }

        return (int) $value;
    }
}
