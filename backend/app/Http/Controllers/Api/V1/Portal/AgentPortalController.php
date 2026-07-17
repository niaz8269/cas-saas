<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\Portal\AgentApplicationResource;
use App\Http\Resources\Portal\AgentPayableResource;
use App\Http\Resources\Portal\AgentStudentResource;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Student;
use App\Support\BrandAssets;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

/**
 * Agent portal reads (report §5.7): strictly the agent's own records.
 * Scope is the authenticated agent from the `agent` guard — no policies
 * or record-scope resolution; the token IS the scope.
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
