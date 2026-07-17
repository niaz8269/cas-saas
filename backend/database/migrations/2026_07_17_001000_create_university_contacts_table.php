<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_contacts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('university_id');
            $table->string('name', 150);
            $table->string('email', 190)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('role', 80)->nullable();
            $table->timestamps();

            $table->index('university_id', 'idx_unicontacts_uni');
            $table->foreign('university_id', 'fk_unicontacts_uni')
                ->references('id')->on('universities')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_contacts');
    }
};
