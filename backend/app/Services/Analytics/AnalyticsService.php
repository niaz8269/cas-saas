<?php

namespace App\Services\Analytics;

use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Student;
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
