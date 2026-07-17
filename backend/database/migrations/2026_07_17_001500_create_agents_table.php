<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->string('agent_code', 40);
            $table->string('name', 180);
            $table->string('type', 20)->default('partner'); // partner|sub|sub_sub
            $table->unsignedBigInteger('parent_agent_id')->nullable();
            $table->string('email', 190)->nullable();
            $table->string('phone', 30)->nullable();
            $table->unsignedBigInteger('country_id')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique('agent_code', 'uq_agents_code');
            $table->index('parent_agent_id', 'idx_agents_parent');
            $table->foreign('parent_agent_id', 'fk_agents_parent')->references('id')->on('agents');
            $table->foreign('country_id', 'fk_agents_country')->references('id')->on('countries');
        });

        Schema::create('agent_agreements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agent_id');
            $table->string('share_type', 20)->default('percent'); // percent|fixed
            $table->decimal('share_value', 15, 2)->default(0);
            $table->json('applies_to')->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->timestamps();

            $table->index('agent_id', 'idx_agentagreements_agent');
            $table->foreign('agent_id', 'fk_agentagreements_agent')->references('id')->on('agents');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_agreements');
        Schema::dropIfExists('agents');
    }
};
