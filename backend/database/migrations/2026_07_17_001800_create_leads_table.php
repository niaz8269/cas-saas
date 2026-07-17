<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 190)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('passport_no', 50)->nullable();
            $table->unsignedBigInteger('country_id')->nullable();
            $table->unsignedBigInteger('website_source_id')->nullable();
            $table->unsignedBigInteger('marketing_source_id')->nullable();
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('assigned_user_id')->nullable();
            $table->string('intake_route', 10)->default('info'); // info|full
            $table->string('status', 20)->default('new');
            $table->unsignedBigInteger('student_id')->nullable();
            $table->unsignedBigInteger('duplicate_of')->nullable();
            $table->text('message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'assigned_user_id', 'created_at'], 'idx_leads_status_assignee_date');
            $table->index('email', 'idx_leads_email');
            $table->index('phone', 'idx_leads_phone');
            $table->index('passport_no', 'idx_leads_passport');
            $table->index('website_source_id', 'idx_leads_website');
            $table->index('campaign_id', 'idx_leads_campaign');
            $table->foreign('country_id', 'fk_leads_country')->references('id')->on('countries');
            $table->foreign('website_source_id', 'fk_leads_website')->references('id')->on('website_sources');
            $table->foreign('marketing_source_id', 'fk_leads_ms')->references('id')->on('marketing_sources');
            $table->foreign('campaign_id', 'fk_leads_campaign')->references('id')->on('campaigns');
            $table->foreign('agent_id', 'fk_leads_agent')->references('id')->on('agents');
            $table->foreign('assigned_user_id', 'fk_leads_assignee')->references('id')->on('users');
            $table->foreign('student_id', 'fk_leads_student')->references('id')->on('students');
            $table->foreign('duplicate_of', 'fk_leads_dupof')->references('id')->on('leads');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
