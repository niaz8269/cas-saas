<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\AgentStoreStudentRequest;
use App\Http\Resources\Portal\AgentApplicationResource;
use App\Http\Resources\Portal\AgentPayableResource;
use App\Http\Resources\Portal\AgentStudentDetailResource;
use App\Http\Resources\Portal\AgentStudentResource;
use App\Models\Activity;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Concerns\Auditable;
use App\Models\Student;
use App\Services\Admissions\ApplicantDataWriter;
use App\Services\Leads\DuplicateDetector;
use App\Services\Leads\LeadIngestionService;
use App\Support\BrandAssets;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Agent portal (report §5.7): strictly the agent's own records — reads, plus
 * the "submit students" write. Scope is the authenticated agent from the
 * `agent` guard — no policies or record-scope resolution; the token IS the scope.
 */
class AgentPortalController extends Controller
{
    public function students(Request $request): AnonymousResourceCollection
    {
        $students = Student::query()
            ->where('agent_id', $request->user()->id)
            ->with('country:id,name')
            ->withCount('applications')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('student_code', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return AgentStudentResource::collection($students);
    }

    /**
     * One of the agent's own students with the full applicant record, so the
     * apply wizard can prefill from what the partner already submitted.
     * Anyone else's student is a 404 — the agent guard is the whole scope.
     */
    public function showStudent(Request $request, Student $student): AgentStudentDetailResource
    {
        abort_unless($student->agent_id === $request->user()->id, 404);

        return new AgentStudentDetailResource($student->load(['guardians', 'education']));
    }

    /**
     * Add a student to the partner's own book (report §5.7 "submit students").
     *
     * The student is created directly in the permanent registry, attributed to
     * the acting agent, so the partner can apply on their behalf immediately.
     * Because this writes the permanent identity, the same exact-match dedup
     * the lead intake uses ({@see LeadIngestionService})
     * guards it: a normalized email / phone / passport hit is refused with 409
     * rather than forking the identity.
     *
     * The audit trail records no actor for portal writes by design
     * ({@see Auditable}), so attribution is carried by
     * `students.agent_id` plus a system entry on the student timeline.
     */
    public function storeStudent(
        AgentStoreStudentRequest $request,
        DuplicateDetector $detector,
        ApplicantDataWriter $applicantData,
    ): JsonResponse {
        $agent = $request->user();
        $data = $request->validated();
        $profile = $data['profile'] ?? [];

        // The identity fields dedup runs on: the login email plus the phone and
        // passport the applicant profile carries.
        $email = $detector->normalizeEmail($data['email'] ?? null);
        $phone = $detector->normalizePhone($profile['phone'] ?? null);
        $passport = $detector->normalizePassport($profile['passport_no'] ?? null);

        if ($existing = $detector->findExactStudent($email, $phone, $passport)) {
            // Only reveal the record when it is already the agent's own —
            // another partner's student must not leak through this surface.
            $mine = $existing->agent_id === $agent->id;

            return response()->json([
                'message' => $mine
                    ? 'This student is already on your list.'
                    : 'A student with these details already exists at CAS. Contact your CAS coordinator.',
                'code' => 'DUPLICATE',
                'student_id' => $mine ? $existing->id : null,
            ], 409);
        }

        $student = DB::transaction(function () use ($data, $profile, $email, $phone, $passport, $agent, $applicantData) {
            $student = Student::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $email,
                'student_code' => Student::nextCode(),
                'agent_id' => $agent->id,
                'status' => 'active',
            ]);

            // Same writer the apply wizards use, so the applicant record is
            // stored identically wherever it was captured.
            $applicantData->write($student, [
                ...$data,
                'profile' => array_filter(
                    [...$profile, 'phone' => $phone, 'passport_no' => $passport],
                    fn ($value) => $value !== null,
                ),
            ]);

            return $student;
        });

        Activity::create([
            'student_id' => $student->id,
            'user_id' => null, // portal action — no staff actor
            'type' => 'system',
            'body' => "Added by partner {$agent->name} ({$agent->agent_code})",
            'meta' => ['agent_id' => $agent->id],
            'created_at' => now(),
        ]);

        return response()->json([
            'data' => new AgentStudentResource(
                $student->load('country:id,name')->loadCount('applications'),
            ),
        ], 201);
    }

    public function applications(Request $request): AnonymousResourceCollection
    {
        $agentId = $request->user()->id;

        // Attribution mirrors the commission engine: the application's own
        // agent link, or the student's agent when the application has none.
        $applications = Application::query()
            ->where(fn ($q) => $q
                ->where('agent_id', $agentId)
                ->orWhere(fn ($sq) => $sq
                    ->whereNull('agent_id')
                    ->whereHas('student', fn ($stq) => $stq->where('agent_id', $agentId))))
            ->with([
                'student:id,student_code,first_name,last_name',
                'university:id,name',
                'program:id,name,level',
                'intake:id,name',
            ])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return AgentApplicationResource::collection($applications);
    }

    public function commissions(Request $request): AnonymousResourceCollection
    {
        $agentId = $request->user()->id;

        $payables = AgentPayable::query()
            ->where('agent_id', $agentId)
            ->with([
                'commission.application.student:id,student_code,first_name,last_name',
                'commission.university:id,name',
                'payments',
            ])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->latest('id')
            ->paginate(min($request->integer('per_page', 25), 100));

        // Own-share totals only — CAS↔university amounts stay internal.
        $totals = AgentPayable::query()
            ->where('agent_id', $agentId)
            ->selectRaw('status, SUM(amount) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (float) $total);

        return AgentPayableResource::collection($payables)
            ->additional(['totals' => $totals]);
    }

    /** Branded commission statement PDF for the agent's own payables. */
    public function statement(Request $request): Response
    {
        $agent = $request->user();

        $payables = AgentPayable::query()
            ->where('agent_id', $agent->id)
            ->with([
                'commission.application:id,application_code,student_id',
                'commission.application.student:id,first_name,last_name,student_code',
                'commission.university:id,name',
            ])
            ->orderByDesc('id')
            ->get();

        $totals = $payables->groupBy('status')->map(fn ($group) => $group->sum(fn ($p) => (float) $p->amount));

        $pdf = Pdf::loadView('pdf.agent-statement', [
            'agent' => $agent,
            'payables' => $payables,
            'totals' => $totals,
            'currency' => $payables->first()->currency ?? 'USD',
            'money' => fn ($value) => number_format((float) $value, 2),
            'logo' => BrandAssets::logoDataUri(),
            'generatedOn' => now()->format('d M Y'),
        ]);

        return $pdf->stream('commission-statement-'.$agent->agent_code.'.pdf');
    }
}
