<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_agreements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('university_id');
            $table->unsignedBigInteger('course_id')->nullable(); // null = all courses
            $table->string('commission_type', 20)->default('percent'); // fixed|percent|tiered
            $table->decimal('commission_value', 15, 2)->default(0);
            $table->char('currency', 3)->nullable();
            $table->string('eligibility_trigger', 60)->default('arrival_first_year_paid');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->timestamps();

            $table->index('university_id', 'idx_agreements_uni');
            $table->index('course_id', 'idx_agreements_course');
            $table->foreign('university_id', 'fk_agreements_uni')->references('id')->on('universities');
            $table->foreign('course_id', 'fk_agreements_course')->references('id')->on('courses');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_agreements');
    }
};
