<?php

namespace Database\Seeders;

use App\Models\Intake;
use App\Models\Program;
use App\Models\University;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Programs from CAS's partner offer sheets (2026-27 intakes): medical programs,
 * degrees, diplomas, preparatory and Chinese-language courses.
 *
 * Only what the catalog can hold properly is imported: name, level, duration,
 * the university's own tuition and hostel fees, age limits (in the existing
 * `requirements` object) and intake rows. Agency package prices and charges,
 * deposits, scholarships and country restrictions are not imported, and the
 * teaching medium is intentionally not recorded. Fees are for reference and
 * subject to each university's confirmation.
 *
 * Never overwrites: a program the catalog already has (same university, level
 * and name) is left exactly as it is. A Ministry "registry only" placeholder
 * with the same name is upgraded into a real program instead of duplicated.
 * Idempotent: a second run finds everything already there.
 */
class PartnerOffersSeeder extends Seeder
{
    public function __construct(private readonly ?string $path = null) {}

    public function run(): void
    {
        $path = $this->path ?? database_path('data/partner_offers_2026.json');
        $data = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];

        $added = $upgraded = $existing = 0;
        $missing = [];

        foreach ($data['universities'] ?? [] as $entry) {
            $university = University::query()->where('name', $entry['university'])->first();

            if (! $university) {
                $missing[] = $entry['university'];

                continue;
            }

            foreach ($entry['programs'] as $row) {
                $key = $this->normalise($row['name']);
                $same = $university->programs()->get()
                    ->filter(fn (Program $p) => $p->level === $row['level'] && $this->normalise($p->name) === $key);

                if ($same->contains(fn (Program $p) => ! $p->registry_only)) {
                    $existing++;

                    continue;
                }

                $attributes = [
                    'duration_months' => $row['duration_months'] ?? null,
                    'tuition_fee' => $row['tuition_fee'] ?? null,
                    'hostel_fee' => $row['hostel_fee'] ?? null,
                    'currency' => 'CNY',
                    'requirements' => $this->requirements($row),
                    'status' => 'active',
                    'registry_only' => false,
                ];

                if ($placeholder = $same->first()) {
                    $placeholder->forceFill($attributes)->save();
                    $program = $placeholder;
                    $upgraded++;
                } else {
                    $program = (new Program)->forceFill($attributes + [
                        'university_id' => $university->id,
                        'name' => $row['name'],
                        'level' => $row['level'],
                    ]);
                    $program->save();
                    $added++;
                }

                foreach ($row['intakes'] ?? [] as $intakeName) {
                    $this->intake($university, $intakeName, $row['application_deadline'] ?? null);
                }
            }
        }

        $this->command?->info("Partner offers: {$added} programs added, {$upgraded} upgraded, {$existing} already present"
            .($missing ? '; universities not in the catalog: '.implode(', ', $missing) : '').'.');
    }

    /** "Clinical Medicine (MBBS)" and "Clinical Medicine" are the same program for matching. */
    private function normalise(string $name): string
    {
        $name = preg_replace('/\([^)]*\)/', '', mb_strtolower($name));

        return trim(preg_replace('/[^a-z0-9]+/', ' ', $name));
    }

    /** @return array<string, int>|null */
    private function requirements(array $row): ?array
    {
        $req = array_filter([
            'min_age' => $row['min_age'] ?? null,
            'max_age' => $row['max_age'] ?? null,
        ], fn ($v) => $v !== null);

        return $req === [] ? null : $req;
    }

    /**
     * One intake per university and month (shared by its programs, so program_id stays empty).
     * An intake whose month has already started is recorded as closed, not open.
     */
    private function intake(University $university, string $name, ?string $deadline): void
    {
        $month = Carbon::parse('1 '.$name);
        $closed = $month->lt(now()->startOfMonth()) || ($deadline !== null && Carbon::parse($deadline)->endOfDay()->lt(now()));

        Intake::query()->firstOrCreate(
            ['university_id' => $university->id, 'program_id' => null, 'name' => $name.' intake'],
            ['application_deadline' => $deadline, 'status' => $closed ? 'closed' : 'open'],
        );
    }
}
