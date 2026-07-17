<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scholarships', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('university_id');
            $table->string('name', 190);
            $table->string('type', 60)->nullable();
            $table->string('coverage', 120)->nullable();
            $table->json('criteria')->nullable();
            $table->date('deadline')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('university_id', 'idx_scholarships_uni');
            $table->foreign('university_id', 'fk_scholarships_uni')->references('id')->on('universities');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarships');
    }
};
