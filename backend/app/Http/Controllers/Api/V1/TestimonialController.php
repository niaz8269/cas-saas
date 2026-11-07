<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Testimonial;
use App\Services\Comms\NotificationService;
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
 */
class TestimonialController extends Controller
{
    private const PUBLIC_FIELDS = ['id', 'audience', 'name', 'headline', 'country', 'quote'];

    // ── Public website ─────────────────────────────────────────────────────

    public function publicIndex(Request $request): JsonResponse
    {
        $audience = $request->string('audience')->value();

        $rows = Testimonial::query()->public()
            ->when(in_array($audience, Testimonial::AUDIENCES, true), fn ($q) => $q->where('audience', $audience))
            ->orderBy('sort_order')->orderByDesc('approved_at')
            ->limit(12)
            ->get(self::PUBLIC_FIELDS);

        return response()->json(['data' => $rows]);
    }

    // ── Student / agent portal ─────────────────────────────────────────────

    /** The signed-in person's own testimonial (if any) and its status. */
    public function mine(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->ownQuery($request)->latest()->first()]);
    }

    public function submit(Request $request, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'quote' => ['required', 'string', 'min:30', 'max:1200'],
            'headline' => ['nullable', 'string', 'max:160'],
            'country' => ['nullable', 'string', 'max:80'],
            'display_name' => ['nullable', 'string', 'max:120'],
            'consent_public' => ['accepted'],
        ], [
            'consent_public.accepted' => 'Please confirm that we may show your words and name on the website.',
        ]);

        // One live testimonial per person: edit by writing to us, or wait for the decision.
        abort_if(
            $this->ownQuery($request)->whereIn('status', ['pending', 'approved'])->exists(),
            422,
            'You have already shared your experience. Thank you!',
        );

        $account = $request->user();
        $audience = $this->audienceOf($request);

        $testimonial = Testimonial::create([
            'audience' => $audience,
            'student_id' => $audience === 'student' ? $account->id : null,
            'agent_id' => $audience === 'agent' ? $account->id : null,
            'name' => $data['display_name'] ?? ($audience === 'student' ? $account->first_name : ($account->name ?? 'Partner')),
            'headline' => $data['headline'] ?? null,
            'country' => $data['country'] ?? null,
            'quote' => $data['quote'],
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
            'quote' => ['required', 'string', 'min:10', 'max:1200'],
            'consent_public' => ['accepted'],
            'status' => ['sometimes', Rule::in(Testimonial::STATUSES)],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ], ['consent_public.accepted' => 'Confirm that this person agreed to be shown on the website.']);

        $data['consent_public'] = true;
        $data['consent_at'] = now();
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
            'status' => ['sometimes', Rule::in(Testimonial::STATUSES)],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        if (($data['status'] ?? null) === 'approved' && $testimonial->status !== 'approved') {
            // Never publish a testimonial whose author did not agree to it.
            abort_unless($testimonial->consent_public, 422, 'This person did not agree to be shown publicly.');
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
