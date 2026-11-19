<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CAS's exclusive programs and universities, shown only to approved agencies, counselors and admins: what the
 * agency earns at each agency level, the fee structure, nationality limits and conditions, and the downloadable
 * marketing material (brochures, banners, price lists). Material can belong to one offer or to the general library.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exclusive_offers', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->string('slug', 220)->unique();
            $table->string('offer_type', 20)->default('program'); // university | program | other
            $table->foreignId('university_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('program_id')->nullable()->constrained()->nullOnDelete();
            $table->text('summary')->nullable();
            // {"partner": {"type": "percent|fixed", "value": 10, "currency": "USD"}, "sub": {...}, "sub_sub": {...}}
            $table->json('commission_rates')->nullable();
            $table->text('commission_notes')->nullable();
            // [{"label": "Tuition", "amount": 30000, "currency": "CNY", "note": "per year"}]
            $table->json('fee_structure')->nullable();
            $table->text('fee_notes')->nullable();
            $table->json('eligible_nationalities')->nullable(); // empty = everyone except the restricted ones
            $table->json('restricted_nationalities')->nullable();
            $table->text('nationality_notes')->nullable();
            $table->text('conditions')->nullable();
            $table->string('status', 20)->default('draft'); // draft | published
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'sort_order']);
        });

        Schema::create('exclusive_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exclusive_offer_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('category', 30)->default('other'); // brochure | banner | social | video | price_list | contract | other
            $table->string('disk', 30);
            $table->string('path', 500);
            $table->string('original_name', 255);
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->unsignedInteger('download_count')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('exclusive_offer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exclusive_materials');
        Schema::dropIfExists('exclusive_offers');
    }
};
