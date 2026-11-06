<?php

namespace App\Http\Resources;

use App\Models\BankAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BankAccount
 */
class BankAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'bank_name' => $this->bank_name,
            'account_name' => $this->account_name,
            'account_number' => $this->account_number,
            'iban' => $this->iban,
            'swift' => $this->swift,
            'bank_address' => $this->bank_address,
            'currency' => $this->currency,
            'instructions' => $this->instructions,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}
