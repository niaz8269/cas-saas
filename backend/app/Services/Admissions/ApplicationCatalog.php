<?php

namespace App\Services\Admissions;

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use Illuminate\Database\Eloquent\Builder;
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
     * Active programs matching a degree tile + funding option. For the two
     * scholarship modes only programs whose university offers a matching
     * award survive, and those awards are attached as `eligibleScholarships`.
     *
     * @return Collection<int, Program>
     */
    public function availability(string $degree, string $funding, string $applicant = 'student'): Collection
    {
        $programs = Program::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->where(fn ($q) => $this->applyDegree($q, $degree))
            ->with([
                'university:id,name,slug,city,moe_listed,logo_path,country_id,application_form',
                'university.country:id,name',
                'intakes' => fn ($q) => $q->where('status', 'open')->orderBy('application_deadline'),
            ])
            ->orderByRaw('tuition_fee is null, tuition_fee')
            ->orderBy('name')
            ->get();

        // Attach the self-funded CAS service charge (scholarship charges are
        // resolved once a specific scholarship is chosen).
        $programs->each(fn (Program $program) => $program->setAttribute(
            'applicant_service_charge',
            $funding === 'self' ? $this->serviceChargeFor($program, $applicant) : null,
        ));

        if ($funding === 'self') {
            return $programs;
        }

        $coverage = $funding === 'partial' ? 'partial' : 'full';
        $byUniversity = $this->scholarshipsByUniversity(
            $programs->pluck('university_id')->unique(),
            $coverage,
        );

        return $programs
            ->filter(fn (Program $program) => $byUniversity->has($program->university_id))
            ->each(fn (Program $program) => $program->setRelation(
                'eligibleScholarships',
                $byUniversity->get($program->university_id),
            ))
            ->values();
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

        return $types->unique('id')->sortBy('name')->values();
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
