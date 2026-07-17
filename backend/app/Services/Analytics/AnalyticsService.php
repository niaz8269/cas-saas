<?php

namespace App\Services\Analytics;

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\MarketingSource;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use App\Models\VisaCase;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Read-model aggregates for the executive dashboard (report §5.10). Every
 * metric is computed through the same visibleTo scopes the record APIs
 * use, so a counselor's dashboard sees only their book while Management
 * sees the whole org — aggregates respect RBAC scope by construction.
 */
class AnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function executive(User $user): array
    {
        return [
            'leads' => $this->leads($user),
            'students' => $this->students($user),
            'applications' => $this->applications($user),
            'commissions' => $this->commissions($user),
            'finance' => $this->finance($user),
            'visa' => $this->visa($user),
        ];
    }

    /**
     * Performance breakdowns for the reports screen (report §5.10):
     * university, agent and lead-source contribution. Scoped like the
     * dashboard.
     *
     * @return array<string, mixed>
     */
    public function performance(User $user): array
    {
        return [
            'universities' => $this->universityPerformance($user),
            'agents' => $this->agentPerformance(),
            'lead_sources' => $this->leadSources($user),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function universityPerformance(User $user): array
    {
        $apps = Application::query()
            ->visibleTo($user)
            ->selectRaw("university_id, COUNT(*) as applications, SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted")
            ->groupBy('university_id')
            ->get()
            ->keyBy('university_id');

        $received = Commission::query()
            ->visibleTo($user)
            ->selectRaw('university_id, SUM(received_amount) as received')
            ->groupBy('university_id')
            ->pluck('received', 'university_id');

        return University::whereIn('id', $apps->keys())
            ->get(['id', 'name', 'code'])
            ->map(fn ($u) => [
                'name' => $u->name,
                'code' => $u->code,
                'applications' => (int) $apps[$u->id]->applications,
                'accepted' => (int) $apps[$u->id]->accepted,
                'commission_received' => (float) ($received[$u->id] ?? 0),
            ])
            ->sortByDesc('applications')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function agentPerformance(): array
    {
        $payables = AgentPayable::query()
            ->selectRaw('agent_id, SUM(amount) as received')
            ->groupBy('agent_id')
            ->pluck('received', 'agent_id');

        return Agent::query()
            ->withCount('students')
            ->get()
            ->map(fn ($a) => [
                'agent_code' => $a->agent_code,
                'name' => $a->name,
                'type' => $a->type,
                'students' => (int) $a->students_count,
                'commission_earned' => (float) ($payables[$a->id] ?? 0),
            ])
            ->sortByDesc('commission_earned')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function leadSources(User $user): array
    {
        $rows = Lead::query()
            ->visibleTo($user)
            ->selectRaw('marketing_source_id, COUNT(*) as total, SUM(CASE WHEN status = \'converted\' THEN 1 ELSE 0 END) as converted')
            ->groupBy('marketing_source_id')
            ->get();

        $names = MarketingSource::whereIn('id', $rows->pluck('marketing_source_id')->filter())
            ->pluck('name', 'id');

        return $rows
            ->map(fn ($r) => [
                'source' => $r->marketing_source_id ? ($names[$r->marketing_source_id] ?? 'Unknown') : 'Direct / API',
                'leads' => (int) $r->total,
                'converted' => (int) $r->converted,
            ])
            ->sortByDesc('leads')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function leads(User $user): array
    {
        $byStatus = $this->countByStatus(Lead::query()->visibleTo($user));
        $total = $byStatus->sum();
        $converted = $byStatus->get('converted', 0);

        return [
            'total' => $total,
            'by_status' => $byStatus,
            'converted' => $converted,
            'conversion_rate' => $total > 0 ? round($converted / $total * 100, 1) : 0.0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function students(User $user): array
    {
        $byStatus = $this->countByStatus(Student::query()->visibleTo($user));

        return ['total' => $byStatus->sum(), 'by_status' => $byStatus];
    }

    /**
     * @return array<string, mixed>
     */
    private function applications(User $user): array
    {
        $byStatus = $this->countByStatus(Application::query()->visibleTo($user));
        $open = $byStatus->except(['accepted', 'rejected', 'withdrawn'])->sum();

        return ['total' => $byStatus->sum(), 'open' => $open, 'by_status' => $byStatus];
    }

    /**
     * @return array<string, mixed>
     */
    private function commissions(User $user): array
    {
        $rows = Commission::query()
            ->visibleTo($user)
            ->selectRaw('status, COUNT(*) as count, SUM(expected_amount) as expected, SUM(received_amount) as received')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $pipeline = $rows->map(fn ($r) => [
            'count' => (int) $r->count,
            'expected' => (float) $r->expected,
            'received' => (float) $r->received,
        ]);

        return [
            'pipeline' => $pipeline,
            'expected_total' => (float) $rows->sum('expected'),
            'received_total' => (float) $rows->sum('received'),
            'currency' => 'CNY',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function finance(User $user): array
    {
        // Student tuition invoices within the user's application scope.
        $base = Invoice::query()
            ->where('party_type', 'student')
            ->whereHas('application', fn ($q) => $q->visibleTo($user));

        $totalBilled = (float) (clone $base)->sum('total');
        $collected = (float) (clone $base)->sum('amount_paid');

        return [
            'billed' => $totalBilled,
            'collected' => $collected,
            'receivables' => round($totalBilled - $collected, 2),
            'currency' => 'CNY',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function visa(User $user): array
    {
        $byStatus = $this->countByStatus(VisaCase::query()->visibleTo($user));

        return ['total' => $byStatus->sum(), 'by_status' => $byStatus];
    }

    /**
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @return Collection<string, int>
     */
    private function countByStatus($query): Collection
    {
        return $query
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($n) => (int) $n);
    }
}
