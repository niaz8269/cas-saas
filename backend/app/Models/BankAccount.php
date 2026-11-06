<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An account CAS receives payments into. Invoices point at one so the voucher
 * and PDF show exactly where to pay. Edits and removals are audited; a removed
 * account stays readable on the invoices that already used it.
 */
class BankAccount extends Model
{
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'label', 'bank_name', 'account_name', 'account_number', 'iban', 'swift',
        'bank_address', 'currency', 'instructions', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
