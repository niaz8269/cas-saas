<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('university_id');
            $table->string('name', 190);
            $table->string('level', 20)->default('bachelor'); // bachelor|master|phd
            $table->unsignedSmallInteger('duration_months')->nullable();
            $table->decimal('tuition_fee', 15, 2)->nullable();
            $table->char('currency', 3)->nullable();
            $table->json('requirements')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('university_id', 'idx_courses_uni');
            $table->foreign('university_id', 'fk_courses_uni')->references('id')->on('universities');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
