<?php

namespace App\Services\Seo;

use App\Models\Intake;
use App\Models\Program;

/**
 * Real numbers for a topic page, taken from the live catalog: how many programs and universities match, the
 * tuition range where the fee is public, and the next open application deadlines. Nothing here is typed in by
 * hand, so it stays true as the catalog changes. Fees the catalog hides from the public are never counted.
 */
class TopicFacts
{
    /**
     * @param  list<string>  $terms  program-name fragments; an empty list means every confirmed program
     * @param  string|null  $level  bachelor, master, phd or non_degree; null means every level
     */
    public function for(array $terms, ?string $level = null): ?array
    {
        return cache()->remember('topic.facts.v3.'.md5(implode('|', $terms).'#'.$level), now()->addHour(), fn () => $this->compute($terms, $level));
    }

    private function compute(array $terms, ?string $level): ?array
    {
        $match = function ($q) use ($terms, $level) {
            $q->where('status', 'active')->where('registry_only', false)
                ->whereHas('university', fn ($u) => $u->where('status', 'active'))
                ->when($level, fn ($w) => $w->where('level', $level))
                ->when($terms !== [], fn ($w) => $w->where(function ($or) use ($terms) {
                    foreach ($terms as $t) {
                        $or->orWhere('name', 'like', '%'.$t.'%');
                    }
                }));
        };

        $programs = 0;
        $universities = [];
        $min = $max = null;
        $feeCount = 0;

        // Streamed, a few columns at a time: the "every program" pages cover the whole catalog.
        Program::query()->tap($match)->select(['id', 'university_id', 'tuition_fee', 'currency', 'visibility'])->cursor()
            ->each(function (Program $p) use (&$programs, &$universities, &$min, &$max, &$feeCount) {
                $programs++;
                $universities[$p->university_id] = true;
                if ($p->currency === 'CNY' && (float) $p->tuition_fee > 0 && $p->audienceCanSee('tuition_fee', 'public')) {
                    $fee = (float) $p->tuition_fee;
                    $min = $min === null ? $fee : min($min, $fee);
                    $max = $max === null ? $fee : max($max, $fee);
                    $feeCount++;
                }
            });

        if ($programs === 0) {
            return null;
        }

        $deadlines = Intake::query()
            ->with('university:id,name,slug')
            ->where('status', 'open')
            ->whereNotNull('application_deadline')->where('application_deadline', '>=', now()->toDateString())
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->when($terms !== [] || $level, fn ($q) => $q->whereHas('program', fn ($p) => $p->tap($match)))
            ->orderBy('application_deadline')->limit(5)->get();

        return [
            'programs' => $programs,
            'universities' => count($universities),
            'tuition' => $level === 'bachelor' && $feeCount >= 3 ? ['min' => (int) $min, 'max' => (int) $max, 'currency' => 'CNY', 'programs' => $feeCount] : null,
            'deadlines' => $deadlines->map(fn (Intake $i) => [
                'university' => $i->university->name,
                'slug' => $i->university->slug,
                'date' => $i->application_deadline->toDateString(),
            ])->values()->all(),
        ];
    }
}
