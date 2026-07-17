<?php

namespace App\Models;

use Database\Factories\StudentGuardianFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentGuardian extends Model
{
    /** @use HasFactory<StudentGuardianFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'name',
        'relation',
        'phone',
        'email',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
