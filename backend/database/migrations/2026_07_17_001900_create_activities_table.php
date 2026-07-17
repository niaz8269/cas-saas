<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('type', 30); // note|call|email|status|system
            $table->text('body')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['student_id', 'created_at'], 'idx_activities_student');
            $table->foreign('student_id', 'fk_activities_student')
                ->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('user_id', 'fk_activities_user')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
