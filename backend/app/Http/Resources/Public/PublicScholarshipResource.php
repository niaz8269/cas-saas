<?php

namespace App\Http\Resources\Public;

use App\Models\Scholarship;
use App\Models\University;
use App\Services\Media\ImageService;
use App\Support\SourceKind;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Scholarship
 */
class PublicScholarshipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $audience = $request->attributes->get('audience', 'public');
        // Per-record, admin-configurable visibility per field (ADR-0015).
        $amountVisible = $this->resource->audienceCanSee('amount', $audience);
        $coverageVisible = $this->resource->audienceCanSee('coverage', $audience);
        $deadlineVisible = $this->resource->audienceCanSee('deadline', $audience);
        $howVisible = $this->resource->audienceCanSee('how_to_apply', $audience);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'coverage' => $coverageVisible ? $this->coverage : null,
            'currency' => $this->currency,
            'description' => $this->description,
            'eligibility' => $this->eligibility,
            // Award specifics — each gated per the record's config; `details_locked`
            // drives the public "sign in to see award details" prompt.
            'details_locked' => ! $amountVisible,
            'amount' => $amountVisible ? $this->amount : null,
            'deadline' => $deadlineVisible ? $this->deadline?->toDateString() : null,
            'application_open_date' => $deadlineVisible ? $this->application_open_date?->toDateString() : null,
            'source_kind' => SourceKind::of($this->source_url),
            'verified_on' => $this->verified_on?->toDateString(),
            'how_to_apply' => $howVisible ? $this->how_to_apply : null,
            'photo_url' => $this->photo()['url'],
            'photo_credit' => $this->photo()['credit'],
            'university' => $this->whenLoaded('university', fn () => [
                'name' => $this->university?->name,
                'slug' => $this->university?->slug,
            ]),
        ];
    }

    /** China-wide scholarships are shown with the campus of the university that runs or hosts them. */
    private const HOSTS = [
        'yenching-fellowship-2027' => 'peking-university',
        'zhejiang-university-doctoral-scholarship-routes' => 'zhejiang-university',
        'tsinghua-graduate-scholarships-2027' => 'tsinghua-university',
        'schwarzman-scholars-class-2028' => 'tsinghua-university',
        'beijing-government-scholarship' => 'beijing-normal-university',
    ];

    /** @var array<string, University> */
    private static array $hosts = [];

    /** @return array{url: string|null, credit: string|null} */
    private function photo(): array
    {
        $images = app(ImageService::class);
        $university = $this->resource->university;
        if (! $university && isset(self::HOSTS[$this->slug])) {
            $slug = self::HOSTS[$this->slug];
            $university = self::$hosts[$slug] ??= University::where('slug', $slug)->first(['id', 'slug', 'cover_path', 'cover_credit']);
        }

        if ($university?->cover_path) {
            return ['url' => $images->url($university->cover_path), 'credit' => $university->cover_credit];
        }

        // National programs without a host campus (CSC): the site's China photo.
        return ['url' => '/images/hero-great-wall.webp', 'credit' => null];
    }
}
