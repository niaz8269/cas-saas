<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A field of study an applicant can express interest in on a general
 * government-scholarship application (where no exact program is chosen).
 */
class Major extends Model
{
    protected $fillable = ['name', 'status'];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
