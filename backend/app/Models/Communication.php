<?php

namespace App\Models;

use Database\Factories\CommunicationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An outbound (or inbound) message against a student across a channel
 * (email|whatsapp|sms|in_app). Statuses: queued → sent → delivered |
 * failed. Every send is also mirrored to the student timeline (Activity).
 */
class Communication extends Model
{
    /** @use HasFactory<CommunicationFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'channel',
        'direction',
        'template',
        'body',
        'status',
        'sent_by',
        'created_at',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MessageLog::class)->latest('created_at')->latest('id');
    }
}
