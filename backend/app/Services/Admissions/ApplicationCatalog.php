<?php

namespace App\Services\Admissions;

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Search\FuzzySearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Read model behind the portal application-submission wizard (both the
 * student self-apply and agent on-behalf flows). Resolves the degree +
 * funding picker into concrete programs, and a chosen program (+ scholarship)
 * into the document checklist the applicant must satisfy.
 */
class ApplicationCatalog
{
    /** The degree tiles the wizard offers (level filters + two by-name). */
    public const DEGREES = ['master', 'bs', 'mbbs', 'bds', 'phd', 'diploma'];

    /** The funding options; scholarship/partial gate on a matching award. */
    public const FUNDING = ['self', 'scholarship', 'partial'];

    /**
     * General document set required until an admin configures a program's
     * own list (report step 4 "for now use general"). Resolved by name.
     */
    public const GENERAL_DOCUMENTS = [
        'Passport',
        'Passport Photo',
        'Medical Examination Form',
        'Police Clearance Certificate',
        'Degree Certificate',
        'Academic Transcript',
        'CV / Resume',
    ];

    /**
     * One page of the active programs matching a degree tile + funding option, narrowed by what the applicant typed.
     * The catalog holds tens of thousands of programs, so they are never all loaded at once: the search, the
     * filters and the paging happen in the database. For the two scholarship modes only programs whose university
     * offers a matching award are listed, and those awards are attached as `eligibleScholarships`.
     *
     * @param  array{q?: ?string, university?: ?string, university_id?: ?int, city?: ?string, language?: ?string}  $filters
     * @return array{0: LengthAwarePaginator, 1: array{original: string, query: string}|null} the page, and the spelling that was used instead when the search was corrected
     */
    public function availabilityPage(string $degree, string $funding, string $applicant, array $filters, int $page, int $perPage): array
    {
        $run = fn (array $f): LengthAwarePaginator => $this->narrow($this->base($degree, $funding), $f)
            ->with([
                'university:id,name,slug,city,moe_listed,logo_path,country_id,application_form',
                'university.country:id,name',
                'intakes' => fn ($q) => $q->where('status', 'open')->orderBy('application_deadline'),
            ])
            // Programs CAS has confirmed come before the ones only found on the official registry; within those,
            // English-taught first, then mixed, then Chinese-taught, then the ones with no language recorded.
            ->orderBy('registry_only')
            ->orderByRaw("case when teaching_language = 'English' then 0 when teaching_language like '%English%' then 1 when teaching_language is null then 3 else 2 end")
            ->orderByRaw('tuition_fee is null, tuition_fee')
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $programs = $run($filters);

        // A search that finds nothing is retried with the closest real spellings ("herbin" finds "Harbin").
        $suggestion = null;
        $text = trim((string) ($filters['q'] ?? ''));
        if ($text !== '' && $programs->total() === 0) {
            foreach (app(FuzzySearch::class)->corrections('apply', $text, fn () => $this->searchPhrases()) as $spelling) {
                $retry = $run([...$filters, 'q' => $spelling]);
                if ($retry->total() > 0) {
                    $programs = $retry;
                    $suggestion = ['original' => $text, 'query' => $spelling];
                    break;
                }
            }
        }

        // Attach the self-funded CAS service charge (scholarship charges are
        // resolved once a specific scholarship is chosen).
        $programs->getCollection()->each(fn (Program $program) => $program->setAttribute(
            'applicant_service_charge',
            $funding === 'self' ? $this->serviceChargeFor($program, $applicant) : null,
        ));

        if ($funding !== 'self') {
            $byUniversity = $this->scholarshipsByUniversity(
                $programs->getCollection()->pluck('university_id')->unique(),
                $funding === 'partial' ? 'partial' : 'full',
            );
            $programs->getCollection()->each(fn (Program $program) => $program->setRelation(
                'eligibleScholarships',
                $byUniversity->get($program->university_id, collect()),
            ));
        }

        return [$programs, $suggestion];
    }

    /** Every name the wizard's search looks at; the spelling helper builds its word list from these. @return \Generator<int, string> */
    private function searchPhrases(): \Generator
    {
        foreach (University::query()->where('status', 'active')->get(['name', 'city']) as $u) {
            yield (string) $u->name;
            yield (string) $u->city;
        }
        foreach (Program::query()->where('status', 'active')->where('registry_only', false)->distinct()->pluck('name') as $name) {
            yield (string) $name;
        }
    }

    /**
     * What the filter boxes offer for a degree + funding choice: the universities, cities and teaching languages
     * of the programs on offer (before any search), so the boxes do not shrink while someone types.
     *
     * @return array{universities: list<array{id: int, name: string}>, cities: list<string>, languages: list<string>}
     */
    public function availabilityFacets(string $degree, string $funding, ?string $universitySlug = null): array
    {
        return cache()->remember('apply.facets.v1.'.md5($degree.'|'.$funding.'|'.$universitySlug), now()->addMinutes(10), function () use ($degree, $funding, $universitySlug) {
            $base = $this->narrow($this->base($degree, $funding), ['university' => $universitySlug]);
            $universities = University::query()
                ->whereIn('id', (clone $base)->select('university_id'))
                ->orderBy('name')->get(['id', 'name', 'city']);

            return [
                'universities' => $universities->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->values()->all(),
                'cities' => $universities->pluck('city')->filter()->unique()->sort(SORT_NATURAL | SORT_FLAG_CASE)->values()->all(),
                'languages' => (clone $base)->whereNotNull('teaching_language')->distinct()->orderBy('teaching_language')->pluck('teaching_language')->all(),
            ];
        });
    }

    /** The programs of a degree tile, for a funding option, with nothing narrowed down yet. */
    private function base(string $degree, string $funding): Builder
    {
        $query = Program::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->where(fn ($q) => $this->applyDegree($q, $degree));

        if ($funding !== 'self') {
            $coverage = $funding === 'partial' ? 'partial' : 'full';
            $query->whereIn('university_id', Scholarship::query()
                ->where('status', 'active')
                ->where(fn ($q) => $q
                    ->where('coverage', 'like', "%{$coverage}%")
                    ->orWhere('type', 'like', "%{$coverage}%")
                    ->orWhere('name', 'like', "%{$coverage}%"))
                ->select('university_id'));
        }

        return $query;
    }

    /**
     * Applies the search words and the filters. Every word must appear in the program, university or city name.
     *
     * @param  array{q?: ?string, university?: ?string, university_id?: ?int, city?: ?string, language?: ?string}  $filters
     */
    private function narrow(Builder $query, array $filters): Builder
    {
        $words = array_values(array_filter(preg_split('/\s+/', trim((string) ($filters['q'] ?? ''))) ?: []));

        foreach (array_slice($words, 0, 6) as $word) {
            $like = '%'.addcslashes($word, '%_\\').'%';
            $query->where(fn ($q) => $q
                ->where('programs.name', 'like', $like)
                ->orWhereHas('university', fn ($u) => $u->where('name', 'like', $like)->orWhere('city', 'like', $like)));
        }

        return $query
            ->when(filled($filters['university'] ?? null), fn ($q) => $q->whereHas('university', fn ($u) => $u->where('slug', $filters['university'])))
            ->when(filled($filters['university_id'] ?? null), fn ($q) => $q->where('university_id', (int) $filters['university_id']))
            ->when(filled($filters['city'] ?? null), fn ($q) => $q->whereHas('university', fn ($u) => $u->where('city', $filters['city'])))
            ->when(filled($filters['language'] ?? null), fn ($q) => $q->where('teaching_language', $filters['language']));
    }

    /**
     * The CAS service charge for a course + applicant type: the specific
     * scholarship's charge when one is chosen, otherwise the self-funded
     * charge. Null if none is set. Amounts live in programs.service_charges.
     *
     * @return array{amount: float, currency: string}|null
     */
    public function serviceChargeFor(Program $program, string $applicant, ?int $scholarshipId = null): ?array
    {
        $charges = $program->service_charges;

        if (! is_array($charges)) {
            return null;
        }

        if ($scholarshipId !== null) {
            $entry = collect($charges['scholarships'] ?? [])
                ->firstWhere('scholarship_id', $scholarshipId);
            $amount = $entry[$applicant] ?? null;
        } else {
            $amount = $charges['self'][$applicant] ?? null;
        }

        if ($amount === null || $amount === '') {
            return null;
        }

        return ['amount' => (float) $amount, 'currency' => $charges['currency'] ?? 'USD'];
    }

    /**
     * Which funding options a degree tile can offer: self-funded always, and
     * scholarship / partial only when an admin has set a matching award on a
     * university that runs a program of that degree.
     *
     * @return array{self: bool, scholarship: bool, partial: bool}
     */
    public function fundingOptions(string $degree): array
    {
        $universityIds = Program::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->where(fn ($q) => $this->applyDegree($q, $degree))
            ->pluck('university_id')
            ->unique();

        return [
            'self' => true,
            'scholarship' => $this->scholarshipsByUniversity($universityIds, 'full')->isNotEmpty(),
            'partial' => $this->scholarshipsByUniversity($universityIds, 'partial')->isNotEmpty(),
        ];
    }

    /**
     * Required document types for a chosen program (+ optional scholarship):
     * the admin-configured set on the program, otherwise the general
     * fallback, plus any scholarship-specific extras (report step 5).
     *
     * @return Collection<int, DocumentType>
     */
    public function requiredDocuments(?Program $program, ?Scholarship $scholarship = null): Collection
    {
        // Global baseline: every application needs the document types flagged
        // required_for 'application' (the same set the admin checklist uses).
        $types = DocumentType::requiredFor('application')->get();

        // Plus the course-specific set — a university's own form (when defined)
        // overrides the program's. Merged on top of the baseline.
        $uniDocs = $this->universityForm($program)['documents'] ?? null;
        $courseDocIds = is_array($uniDocs) && $uniDocs !== []
            ? $uniDocs
            : ($program?->requirements['documents'] ?? []);
        $types = $types->concat($this->resolveTypes($courseDocIds));

        // Ultimate fallback when nothing is flagged or configured anywhere.
        if ($types->isEmpty()) {
            $types = DocumentType::whereIn('name', self::GENERAL_DOCUMENTS)->get();
        }

        if ($scholarship !== null) {
            $types = $types->concat($this->resolveTypes($scholarship->criteria['documents'] ?? []));
        }

        // A Master's or PhD scholarship application has its own required checklist.
        if ($this->isPostgraduateScholarship($program, $scholarship)) {
            $types = $types->concat(DocumentType::requiredFor('scholarship_postgraduate')->get());
        }

        return $types->unique('id')->sortBy('name')->values();
    }

    /**
     * Documents worth uploading when available but never needed to submit (an experience letter, research papers).
     *
     * @return Collection<int, DocumentType>
     */
    public function optionalDocuments(?Program $program, ?Scholarship $scholarship = null): Collection
    {
        if (! $this->isPostgraduateScholarship($program, $scholarship)) {
            return collect();
        }

        $required = $this->requiredDocuments($program, $scholarship)->pluck('id');

        return DocumentType::requiredFor('scholarship_postgraduate_optional')->get()
            ->reject(fn (DocumentType $type) => $required->contains($type->id))
            ->sortBy('name')->values();
    }

    private function isPostgraduateScholarship(?Program $program, ?Scholarship $scholarship): bool
    {
        return $scholarship !== null && in_array($program?->level, ['master', 'phd', 'doctor', 'doctoral'], true);
    }

    /** The field types the admin can attach to a course/university (report item 11). */
    public const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'radio'];

    /**
     * The application-form config defined on a program's university, or []. When
     * a university defines a form, it drives the wizard's custom fields +
     * required documents for every program at that university.
     *
     * @return array<string, mixed>
     */
    private function universityForm(?Program $program): array
    {
        $form = $program?->university?->application_form;

        return is_array($form) ? $form : [];
    }

    /**
     * The admin-defined custom application fields for a program: a normalised
     * list of {key,label,type,required,options}. Only well-formed entries
     * survive; empty when none configured.
     *
     * @return array<int, array<string, mixed>>
     */
    public function customFields(?Program $program): array
    {
        // A university's own form (when defined) overrides the program's fields.
        $uniFields = $this->universityForm($program)['fields'] ?? null;
        $fields = is_array($uniFields) && $uniFields !== []
            ? $uniFields
            : ($program?->requirements['fields'] ?? []);

        return collect($fields)
            ->filter(fn ($f) => is_array($f)
                && ! empty($f['key'])
                && ! empty($f['label'])
                && in_array($f['type'] ?? null, self::FIELD_TYPES, true))
            ->map(fn ($f) => [
                'key' => (string) $f['key'],
                'label' => (string) $f['label'],
                'type' => (string) $f['type'],
                'required' => (bool) ($f['required'] ?? false),
                'options' => array_values(array_filter(
                    (array) ($f['options'] ?? []),
                    fn ($o) => is_string($o) && $o !== '',
                )),
            ])
            ->values()
            ->all();
    }

    /**
     * Validate + clean an applicant's answers to a program's custom fields.
     * Unknown keys are dropped, required fields must be present, select answers
     * must be a configured option, and numbers/dates are checked. Returns the
     * cleaned key => value map (configured keys only), or [] when none apply.
     *
     * @param  array<string, mixed>  $answers
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function validateCustomFields(?Program $program, array $answers): array
    {
        $spec = $this->customFields($program);

        if ($spec === []) {
            return [];
        }

        $rules = [];
        $attributes = [];

        foreach ($spec as $field) {
            $key = $field['key'];
            $presence = $field['required'] ? 'required' : 'nullable';

            $rules["custom_fields.{$key}"] = match ($field['type']) {
                'number' => [$presence, 'numeric'],
                'date' => [$presence, 'date'],
                'select', 'radio' => [$presence, 'string', Rule::in($field['options'])],
                'textarea' => [$presence, 'string', 'max:5000'],
                default => [$presence, 'string', 'max:1000'],
            };
            $attributes["custom_fields.{$key}"] = $field['label'];
        }

        $validated = Validator::make(['custom_fields' => $answers], $rules, [], $attributes)->validate();

        return $validated['custom_fields'] ?? [];
    }

    /** Constrain a program query to one degree tile. */
    private function applyDegree(Builder $query, string $degree): Builder
    {
        return match ($degree) {
            'master' => $query->where('level', 'master'),
            'phd' => $query->whereIn('level', ['phd', 'doctor', 'doctoral']),
            'diploma' => $query->where('level', 'diploma'),
            'mbbs' => $query->where('name', 'like', '%MBBS%'),
            'bds' => $query->where(fn ($q) => $q
                ->where('name', 'like', '%BDS%')
                ->orWhere('name', 'like', '%Stomatolog%')),
            // "BS" is a general bachelor — the medical bachelors have their
            // own tiles, so exclude them here.
            'bs' => $query->where('level', 'bachelor')
                ->where('name', 'not like', '%MBBS%')
                ->where('name', 'not like', '%BDS%')
                ->where('name', 'not like', '%Stomatolog%'),
            default => $query->whereRaw('1 = 0'),
        };
    }

    /**
     * Active scholarships whose coverage/type/name signals the wanted band
     * ("full" | "partial"), grouped by university.
     *
     * @param  Collection<int, int>  $universityIds
     * @return Collection<int, Collection<int, Scholarship>>
     */
    private function scholarshipsByUniversity(Collection $universityIds, string $coverage): Collection
    {
        if ($universityIds->isEmpty()) {
            return collect();
        }

        return Scholarship::query()
            ->where('status', 'active')
            ->whereIn('university_id', $universityIds->all())
            ->where(fn ($q) => $q
                ->where('coverage', 'like', "%{$coverage}%")
                ->orWhere('type', 'like', "%{$coverage}%")
                ->orWhere('name', 'like', "%{$coverage}%"))
            ->orderBy('name')
            ->get()
            ->groupBy('university_id');
    }

    /**
     * Resolve a mixed list of document-type ids or names to models. Admin
     * config stores ids; legacy/seed data may store names — accept both.
     *
     * @param  array<int, int|string>  $entries
     * @return Collection<int, DocumentType>
     */
    private function resolveTypes(array $entries): Collection
    {
        if ($entries === []) {
            return collect();
        }

        $ids = array_values(array_filter($entries, fn ($e) => is_int($e) || (is_string($e) && ctype_digit($e))));
        $names = array_values(array_filter($entries, fn ($e) => is_string($e) && ! ctype_digit($e)));

        return DocumentType::query()
            ->when($ids !== [], fn ($q) => $q->orWhereIn('id', $ids))
            ->when($names !== [], fn ($q) => $q->orWhere(function ($inner) use ($names) {
                foreach ($names as $name) {
                    $inner->orWhere('name', 'like', '%'.$name.'%');
                }
            }))
            ->get();
    }
}
