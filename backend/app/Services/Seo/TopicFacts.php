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
    /** @param list<string> $terms program-name fragments; an empty list means every confirmed program */
    public function for(array $terms): ?array
    {
        return cache()->remember('topic.facts.v1.'.md5(implode('|', $terms)), now()->addHour(), fn () => $this->compute($terms));
    }

    private function compute(array $terms): ?array
    {
        $programs = Program::query()
            ->where('status', 'active')->where('registry_only', false)
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->when($terms !== [], fn ($q) => $q->where(function ($w) use ($terms) {
                foreach ($terms as $t) {
                    $w->orWhere('name', 'like', '%'.$t.'%');
                }
            }))
            ->get(['id', 'university_id', 'name', 'tuition_fee', 'currency', 'visibility']);

        if ($programs->isEmpty()) {
            return null;
        }

        $fees = $programs->filter(fn (Program $p) => $p->currency === 'CNY' && (float) $p->tuition_fee > 0 && $p->audienceCanSee('tuition_fee', 'public'))
            ->map(fn (Program $p) => (float) $p->tuition_fee);

        $deadlines = Intake::query()
            ->with('university:id,name,slug')
            ->where('status', 'open')
            ->whereNotNull('application_deadline')->where('application_deadline', '>=', now()->toDateString())
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->when($terms !== [], fn ($q) => $q->whereHas('program', fn ($p) => $p->where(function ($w) use ($terms) {
                foreach ($terms as $t) {
                    $w->orWhere('name', 'like', '%'.$t.'%');
                }
            })))
            ->orderBy('application_deadline')->limit(5)->get();

        return [
            'programs' => $programs->count(),
            'universities' => $programs->pluck('university_id')->unique()->count(),
            'tuition' => $fees->count() >= 3 ? ['min' => (int) $fees->min(), 'max' => (int) $fees->max(), 'currency' => 'CNY', 'programs' => $fees->count()] : null,
            'deadlines' => $deadlines->map(fn (Intake $i) => [
                'university' => $i->university->name,
                'slug' => $i->university->slug,
                'date' => $i->application_deadline->toDateString(),
            ])->values()->all(),
        ];
    }
}
