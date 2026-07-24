<?php

namespace App\Models\Concerns;

/**
 * Admin-configurable field × audience visibility (ADR-0015). The record's
 * `visibility` map holds, per gateable section, the audiences allowed to see
 * it. A section left unset falls back to the Phase-1 default: registered
 * users (student/agent/counselor) see it, the public does not.
 *
 * @property array<string, list<string>>|null $visibility
 */
trait HasAudienceVisibility
{
    /** Every audience a section can be granted to. */
    public const AUDIENCES = ['public', 'student', 'agent', 'counselor'];

    public function audienceCanSee(string $section, string $audience): bool
    {
        $config = $this->visibility[$section] ?? null;

        if (is_array($config)) {
            return in_array($audience, $config, true);
        }

        return $audience !== 'public';
    }

    /**
     * Sanitise on save: keep only this model's gateable sections mapped to
     * valid audiences (deny-by-default), so a client can never persist an
     * unknown section or audience. Stored null when nothing survives.
     */
    public function setVisibilityAttribute(mixed $value): void
    {
        if (! is_array($value)) {
            $this->attributes['visibility'] = null;

            return;
        }

        $clean = [];

        foreach (static::GATEABLE_SECTIONS as $section) {
            if (isset($value[$section]) && is_array($value[$section])) {
                $clean[$section] = array_values(array_intersect(
                    array_map('strval', $value[$section]),
                    self::AUDIENCES,
                ));
            }
        }

        $this->attributes['visibility'] = $clean !== [] ? json_encode($clean) : null;
    }
}
