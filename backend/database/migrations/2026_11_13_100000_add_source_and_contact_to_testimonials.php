<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Where a testimonial came from, and a private email for the ones sent through the public form. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->string('source', 10)->default('portal')->after('audience');   // public | portal | staff
            $t->string('contact_email', 190)->nullable()->after('source')->index(); // never shown
        });
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->dropColumn(['source', 'contact_email']);
        });
    }
};
