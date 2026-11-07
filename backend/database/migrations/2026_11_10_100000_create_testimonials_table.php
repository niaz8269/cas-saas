<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Words from real students and partner agencies, shown on the public site only
 * after the author agreed to it (consent_public) and staff approved it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $t) {
            $t->id();
            $t->string('audience', 10);                 // student | agent
            $t->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name', 120);                    // as it should be shown
            $t->string('headline', 160)->nullable();    // e.g. "MBBS student, Jilin University"
            $t->string('country', 80)->nullable();
            $t->text('quote');
            $t->boolean('consent_public')->default(false);
            $t->timestamp('consent_at')->nullable();
            $t->string('status', 10)->default('pending'); // pending | approved | rejected
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamp('approved_at')->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->index(['audience', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
