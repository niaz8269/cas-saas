<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Testimonial;
use App\Services\Comms\NotificationService;
use App\Services\Media\ImageService;
use App\Support\CountryList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Testimonials, three doors into one table:
 *  - public: approved + consented ones only, for the website;
 *  - portal: a student or partner writes their own (lands as "pending");
 *  - admin: staff review, edit, approve or reject, and may enter one that a
 *    person gave them in writing (consent must be confirmed).
 *
 * Private fields (how they found us, ids, status) never reach the public list.
 */
class TestimonialController extends Controller
{
    private const PUBLIC_FIELDS = [
        'id', 'audience', 'name', 'headline', 'country', 'country_code', 'quote', 'photo_path', 'title',
        'university', 'degree', 'program', 'intake_year', 'services', 'recommend',
        'partner_since', 'students_referred', 'student_id', 'agent_id',
    ];

    /** Only paths this app produced for a testimonial photo (never an arbitrary URL). */
    private const PHOTO_PATTERN = '#^(/uploads/)?testimonials/[0-9a-f-]{36}\\.webp$#';

    // ── Public website ─────────────────────────────────────────────────────

    public function publicIndex(Request $request, ImageService $images): JsonResponse
    {
        $audience = $request->string('audience')->value();

        $base = Testimonial::query()->public()
            ->when(in_array($audience, Testimonial::AUDIENCES, true), fn ($q) => $q->where('audience', $audience));

        $rows = (clone $base)->orderBy('sort_order')->orderByDesc('approved_at')->limit(150)->get(self::PUBLIC_FIELDS)
            ->map(function (Testimonial $t) use ($images) {
                // "Verified" = written from the person's own CAS account, not typed in by staff.
                $row = $t->toArray();
                $row['photo_url'] = $images->url($t->photo_path);
                $row['verified'] = $t->student_id !== null || $t->agent_id !== null;
                unset($row['student_id'], $row['agent_id'], $row['photo_path']);

                return $row;
            });

        return response()->json([
            'data' => $rows,
            'summary' => [
                'count' => (clone $base)->count(),
                'recommend_percent' => ($rec = (clone $base)->whereNotNull('recommend'))->count()
                    ? (int) round(100 * (clone $rec)->where('recommend', true)->count() / (clone $rec)->count())
                    : null,
            ],
        ]);
    }

    // ── Public form (no account) ───────────────────────────────────────────

    /**
     * Anyone with the link can send a testimonial, no account needed. It lands as "pending" and
     * nothing is shown until staff approve it. Guarded by a throttle, a hidden honeypot field, a
     * required email, and one live testimonial per email address.
     */
    public function publicSubmit(Request $request, NotificationService $notifications): JsonResponse
    {
        // Bots fill every field, including the one people never see: pretend it worked, store nothing.
        if (filled($request->input('website'))) {
            return response()->json(['data' => ['id' => 0, 'status' => 'pending']], 201);
        }

        $audience = $request->input('audience');
        abort_unless(in_array($audience, Testimonial::AUDIENCES, true), 422, 'Please choose whether you are a student or a partner.');

        $rules = $this->portalRules($audience) + [
            'audience' => ['required', Rule::in(Testimonial::AUDIENCES)],
            'contact_email' => ['required', 'email', 'max:190'],
        ];
        if ($audience === 'agent') {
            $rules['display_name'] = ['required', 'string', 'min:2', 'max:120'];
            $rules['photo_path'] = ['nullable', 'string', 'max:255', 'regex:'.self::PHOTO_PATTERN];
        }

        $data = $request->validate($rules, [
            'consent_public.accepted' => 'Please confirm that we may show your words and name on the website.',
            'photo_path.regex' => 'Please upload your photo again.',
            'photo_path.required' => 'Please add your photo.',
            'contact_email.required' => 'Please give your email so we can reach you.',
        ]);

        $email = mb_strtolower(trim($data['contact_email']));
        abort_if(
            Testimonial::query()->where('contact_email', $email)->whereIn('status', ['pending', 'approved'])->exists(),
            422,
            'We already have a testimonial from this email address. Thank you!',
        );

        $testimonial = Testimonial::create([
            'audience' => $audience,
            'source' => 'public',
            'contact_email' => $email,
            'name' => trim($data['display_name']),
            'headline' => $data['headline'] ?? null,
            'country' => isset($data['country_code']) ? CountryList::name($data['country_code']) : ($data['country'] ?? null),
            'country_code' => $data['country_code'] ?? null,
            'quote' => $data['quote'],
            'photo_path' => $data['photo_path'] ?? null,
            'title' => $data['title'] ?? null,
            'university' => $data['university'] ?? null,
            'degree' => $data['degree'] ?? null,
            'program' => $data['program'] ?? null,
            'intake_year' => $data['intake_year'] ?? null,
            'services' => $data['services'] ?? null,
            'found_us' => $data['found_us'] ?? null,
            'recommend' => $data['recommend'] ?? null,
            'partner_since' => $data['partner_since'] ?? null,
            'students_referred' => $data['students_referred'] ?? null,
            'consent_public' => true,
            'consent_at' => now(),
            'status' => 'pending',
        ]);

        $notifications->pushToRoles(['Admin'], 'testimonial', 'New testimonial to review', mb_strimwidth($data['quote'], 0, 120, '...'), entityType: 'testimonial', entityId: $testimonial->id);

        return response()->json(['data' => $testimonial->only(['id', 'status'])], 201);
    }

    // ── Student / agent portal ─────────────────────────────────────────────

    /** The signed-in person's own testimonial (if any) and its status. */
    public function mine(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->ownQuery($request)->latest()->first()]);
    }

    /** A student's or partner's own picture: converted to WebP, kept until they submit their testimonial. */
    public function uploadPhoto(Request $request, ImageService $images): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ], ['image.max' => 'Photos may not exceed 5 MB.', 'image.mimes' => 'Use a JPEG, PNG or WebP photo.']);

        $stored = $images->storeWebp($request->file('image'), 'testimonials');

        return response()->json(['path' => $stored['path'], 'url' => $stored['url']], 201);
    }

    public function submit(Request $request, NotificationService $notifications): JsonResponse
    {
        $audience = $this->audienceOf($request);

        $data = $request->validate($this->portalRules($audience), [
            'consent_public.accepted' => 'Please confirm that we may show your words and name on the website.',
            'photo_path.regex' => 'Please upload your photo again.',
            'photo_path.required' => 'Please add your photo.',
        ]);

        // One live testimonial per person: edit by writing to us, or wait for the decision.
        abort_if(
            $this->ownQuery($request)->whereIn('status', ['pending', 'approved'])->exists(),
            422,
            'You have already shared your experience. Thank you!',
        );

        $account = $request->user();

        $testimonial = Testimonial::create([
            'audience' => $audience,
            'student_id' => $audience === 'student' ? $account->id : null,
            'agent_id' => $audience === 'agent' ? $account->id : null,
            'name' => filled($data['display_name'] ?? null) ? trim($data['display_name']) : (string) ($account->name ?? 'Partner'),
            'headline' => $data['headline'] ?? null,
            'country' => isset($data['country_code']) ? CountryList::name($data['country_code']) : ($data['country'] ?? null),
            'country_code' => $data['country_code'] ?? null,
            'quote' => $data['quote'],
            'photo_path' => $data['photo_path'] ?? null,
            'title' => $data['title'] ?? null,
            'university' => $data['university'] ?? null,
            'degree' => $data['degree'] ?? null,
            'program' => $data['program'] ?? null,
            'intake_year' => $data['intake_year'] ?? null,
            'services' => $data['services'] ?? null,
            'found_us' => $data['found_us'] ?? null,
            'recommend' => $data['recommend'] ?? null,
            'partner_since' => $data['partner_since'] ?? null,
            'students_referred' => $data['students_referred'] ?? null,
            'consent_public' => true,
            'consent_at' => now(),
            'status' => 'pending',
        ]);

        $notifications->pushToRoles(['Admin'], 'testimonial', 'New testimonial to review', mb_strimwidth($data['quote'], 0, 120, '...'), entityType: 'testimonial', entityId: $testimonial->id);

        return response()->json(['data' => $testimonial->only(['id', 'status'])], 201);
    }

    // ── Staff ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $rows = Testimonial::query()
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.audience'), fn ($q) => $q->where('audience', $request->input('filter.audience')))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'audience' => ['required', Rule::in(Testimonial::AUDIENCES)],
            'name' => ['required', 'string', 'max:120'],
            'headline' => ['nullable', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'country_code' => ['required_if:audience,student', 'nullable', Rule::in(array_keys(CountryList::NAMES))],
            'quote' => ['required', 'string', 'min:10', 'max:1200'],
            'title' => ['nullable', 'string', 'max:120'],
            'university' => ['nullable', 'string', 'max:160'],
            'degree' => ['nullable', Rule::in(Testimonial::DEGREES)],
            'program' => ['nullable', 'string', 'max:160'],
            'intake_year' => ['nullable', 'integer', 'between:2000,2100'],
            'recommend' => ['nullable', 'boolean'],
            'consent_public' => ['accepted'],
            'status' => ['sometimes', Rule::in(Testimonial::STATUSES)],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ], ['consent_public.accepted' => 'Confirm that this person agreed to be shown on the website.']);

        if (! empty($data['country_code'])) {
            $data['country'] = CountryList::name($data['country_code']);
        }
        $data['consent_public'] = true;
        $data['consent_at'] = now();
        $data['source'] = 'staff';
        $data['status'] ??= 'approved';
        $data['approved_at'] = $data['status'] === 'approved' ? now() : null;

        return response()->json(['data' => Testimonial::create($data)], 201);
    }

    public function update(Request $request, Testimonial $testimonial): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'headline' => ['nullable', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'quote' => ['sometimes', 'string', 'min:10', 'max:1200'],
            'title' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(Testimonial::STATUSES)],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        if (($data['status'] ?? null) === 'approved' && $testimonial->status !== 'approved') {
            // Never publish a testimonial whose author did not agree to it.
            abort_unless($testimonial->consent_public, 422, 'This person did not agree to be shown publicly.');
            // Students appear on the globe at their nationality, so one without it could not be shown anywhere.
            abort_if($testimonial->audience === 'student' && ! $testimonial->country_code, 422, 'Add the nationality of the student first: the testimonial is shown on the globe at that country.');
            $data['approved_at'] = now();
        }

        $testimonial->update($data);

        return response()->json(['data' => $testimonial->fresh()]);
    }

    public function destroy(Testimonial $testimonial): Response
    {
        $testimonial->delete();

        return response()->noContent();
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /** @return array<string, array<int, mixed>> */
    private function portalRules(string $audience): array
    {
        $common = [
            'title' => ['nullable', 'string', 'max:120'],
            'quote' => ['required', 'string', 'min:30', 'max:1200'],
            'recommend' => ['nullable', 'boolean'],
            'consent_public' => ['accepted'],
        ];

        return $audience === 'student'
            ? $common + [
                // A student is shown with a real face and what they studied, so these are all required.
                'display_name' => ['required', 'string', 'min:2', 'max:120'],
                'photo_path' => ['required', 'string', 'max:255', 'regex:'.self::PHOTO_PATTERN],
                'country_code' => ['required', Rule::in(array_keys(CountryList::NAMES))],
                'university' => ['required', 'string', 'max:160'],
                'degree' => ['required', Rule::in(Testimonial::DEGREES)],
                'program' => ['required', 'string', 'max:160'],
                'intake_year' => ['nullable', 'integer', 'between:2000,2100'],
                'services' => ['nullable', 'array', 'max:6'],
                'services.*' => ['string', Rule::in(Testimonial::STUDENT_SERVICES)],
                'found_us' => ['nullable', Rule::in(Testimonial::FOUND_US)],
            ]
            : $common + [
                // A partner may choose how it is shown (company or person) and add a photo or logo; both are optional.
                'display_name' => ['nullable', 'string', 'min:2', 'max:120'],
                'photo_path' => ['nullable', 'string', 'max:255', 'regex:'.self::PHOTO_PATTERN],
                'headline' => ['nullable', 'string', 'max:160'],
                'country' => ['nullable', 'string', 'max:80'],
                'partner_since' => ['nullable', 'digits:4'],
                'students_referred' => ['nullable', Rule::in(Testimonial::REFERRED)],
                'services' => ['nullable', 'array', 'max:6'],
                'services.*' => ['string', Rule::in(Testimonial::PARTNER_STRENGTHS)],
            ];
    }

    private function audienceOf(Request $request): string
    {
        return $request->user() instanceof Agent ? 'agent' : 'student';
    }

    private function ownQuery(Request $request)
    {
        $audience = $this->audienceOf($request);

        return Testimonial::query()->where($audience === 'agent' ? 'agent_id' : 'student_id', $request->user()->id);
    }
}
