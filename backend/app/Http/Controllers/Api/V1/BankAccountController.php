<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BankAccountResource;
use App\Models\BankAccount;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * CAS receipt accounts. Route middleware gates access: viewing needs
 * finance.view (so invoice pickers work), changes need finance.manage.
 */
class BankAccountController extends Controller
{
    /** Active accounts for pickers; `?all=1` also lists inactive ones for the manager. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $all = $request->boolean('all') && $request->user()->can('finance.manage.global');

        return BankAccountResource::collection(
            BankAccount::query()
                ->when(! $all, fn ($q) => $q->where('is_active', true))
                ->orderBy('sort_order')->orderBy('label')
                ->get(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        // Refresh so column defaults (active, not default) are real attributes.
        $account = BankAccount::create($this->validated($request))->refresh();
        $assigned = $this->applyDefault($account);

        return (new BankAccountResource($account))
            ->additional(['meta' => ['assigned_invoices' => $assigned]])
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, BankAccount $bankAccount): BankAccountResource
    {
        $bankAccount->update($this->validated($request, partial: true));
        $assigned = $this->applyDefault($bankAccount);

        return (new BankAccountResource($bankAccount->refresh()))
            ->additional(['meta' => ['assigned_invoices' => $assigned]]);
    }

    /**
     * An active default account is the one the system uses for invoices it raises
     * itself. Only one default per currency; and open invoices that still have no
     * account (the students are being told to ask their counselor) get it now.
     * Returns how many invoices were assigned.
     */
    private function applyDefault(BankAccount $account): int
    {
        if (! $account->is_default || ! $account->is_active) {
            return 0;
        }

        return DB::transaction(function () use ($account) {
            BankAccount::query()
                ->where('id', '!=', $account->id)->where('is_default', true)
                ->when(
                    $account->currency === null,
                    fn ($q) => $q->whereNull('currency'),
                    fn ($q) => $q->where('currency', $account->currency),
                )
                ->update(['is_default' => false]);

            return Invoice::query()
                ->whereNull('bank_account_id')
                ->whereNotIn('status', ['draft', 'paid', 'cancelled'])
                ->when($account->currency !== null, fn ($q) => $q->where('currency', $account->currency))
                ->update(['bank_account_id' => $account->id]);
        });
    }

    /**
     * Soft delete: invoices already raised keep showing the account they used.
     * Deactivating (is_active=false) is the gentler way to retire one.
     */
    public function destroy(BankAccount $bankAccount): JsonResponse
    {
        $bankAccount->delete();

        return response()->json(['message' => 'Bank account removed.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'label' => [$req, 'string', 'max:120'],
            'bank_name' => [$req, 'string', 'max:160'],
            'account_name' => [$req, 'string', 'max:160'],
            'account_number' => [$req, 'string', 'max:64'],
            'iban' => ['nullable', 'string', 'max:64'],
            'swift' => ['nullable', 'string', 'max:32'],
            'bank_address' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'size:3'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);
    }
}
