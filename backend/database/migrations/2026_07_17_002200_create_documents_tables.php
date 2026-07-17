<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('category', 60)->nullable();
            $table->boolean('is_sensitive')->default(false);
            $table->json('required_for')->nullable();
            $table->timestamps();

            $table->unique('name', 'uq_doctypes_name');
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_type_id')->nullable();
            $table->string('documentable_type', 150);
            $table->unsignedBigInteger('documentable_id');
            $table->string('file_path', 500);
            $table->string('file_name', 255);
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('status', 20)->default('pending'); // pending|verified|rejected
            $table->unsignedInteger('version')->default(1);
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['documentable_type', 'documentable_id'], 'idx_documents_poly');
            $table->index('document_type_id', 'idx_documents_type');
            $table->foreign('document_type_id', 'fk_documents_type')->references('id')->on('document_types');
            $table->foreign('verified_by', 'fk_documents_verifier')->references('id')->on('users');
        });

        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 20); // view|download|upload
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['document_id', 'created_at'], 'idx_dal_doc');
            $table->foreign('document_id', 'fk_dal_doc')
                ->references('id')->on('documents')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_access_logs');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('document_types');
    }
};
