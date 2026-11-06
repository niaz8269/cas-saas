<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BankAccountResource;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
        $account = BankAccount::create($this->validated($request));

        return (new BankAccountResource($account))->response()->setStatusCode(201);
    }

    public function update(Request $request, BankAccount $bankAccount): BankAccountResource
    {
        $bankAccount->update($this->validated($request, partial: true));

        return new BankAccountResource($bankAccount->refresh());
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
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);
    }
}
