<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Multi-party invoice (student|agent|university). Statuses:
 * draft → issued → partially_paid → paid → cancelled → overdue.
 * Financial corrections are adjusting entries, never overwrites.
 */
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_no',
        'party_type',
        'party_id',
        'application_id',
        'currency',
        'subtotal',
        'tax',
        'total',
        'amount_paid',
        'status',
        'issued_at',
        'due_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'issued_at' => 'datetime',
            'due_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** Resolve the invoiced party (student/agent/university). */
    public function party(): Student|Agent|University|null
    {
        return match ($this->party_type) {
            'student' => Student::find($this->party_id),
            'agent' => Agent::find($this->party_id),
            'university' => University::find($this->party_id),
            default => null,
        };
    }
}
