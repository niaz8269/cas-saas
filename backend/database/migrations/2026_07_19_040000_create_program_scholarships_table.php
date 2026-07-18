<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which of a university's scholarships support a given program. Admins pick
 * these while adding a course; the apply flow and the service-charge matrix
 * are driven by this link.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_scholarships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignId('scholarship_id')->constrained('scholarships')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['program_id', 'scholarship_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_scholarships');
    }
};
