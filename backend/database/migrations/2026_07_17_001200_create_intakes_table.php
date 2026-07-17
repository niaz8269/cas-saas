<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intakes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('university_id');
            $table->unsignedBigInteger('course_id')->nullable();
            $table->string('name', 80);
            $table->date('start_date')->nullable();
            $table->date('application_deadline')->nullable();
            $table->unsignedInteger('seats')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamps();

            $table->index('university_id', 'idx_intakes_uni');
            $table->index('course_id', 'idx_intakes_course');
            $table->foreign('university_id', 'fk_intakes_uni')->references('id')->on('universities');
            $table->foreign('course_id', 'fk_intakes_course')->references('id')->on('courses');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intakes');
    }
};
