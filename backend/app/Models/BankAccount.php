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
        'bank_address', 'currency', 'instructions', 'is_active', 'is_default', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_default' => 'boolean', 'sort_order' => 'integer'];
    }

    /** The account the system uses for invoices it raises itself, if one is set for this currency. */
    public static function defaultFor(string $currency): ?self
    {
        return static::query()
            ->where('is_active', true)->where('is_default', true)
            ->where(fn ($q) => $q->whereNull('currency')->orWhere('currency', strtoupper($currency)))
            ->orderByRaw('currency is null') // an exact-currency account beats a catch-all
            ->first();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
