<?php

namespace App\Models;

use Database\Factories\UniversityContactFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UniversityContact extends Model
{
    /** @use HasFactory<UniversityContactFactory> */
    use HasFactory;

    protected $fillable = [
        'university_id',
        'name',
        'email',
        'phone',
        'role',
    ];

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}
