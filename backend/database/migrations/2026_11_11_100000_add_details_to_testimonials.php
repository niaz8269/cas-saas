<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Richer testimonials: who they are, what they studied, a photo, and what they did with CAS. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->string('photo_path', 255)->nullable()->after('country');        // their own picture
            $t->string('title', 120)->nullable()->after('photo_path');          // optional headline
            $t->string('university', 160)->nullable()->after('title');          // student
            $t->string('degree', 20)->nullable()->after('university');          // student: bachelor, master...
            $t->string('program', 160)->nullable()->after('degree');            // student: their major
            $t->unsignedSmallInteger('intake_year')->nullable()->after('program');
            $t->json('services')->nullable()->after('intake_year');             // what they used / value most
            $t->string('found_us', 40)->nullable()->after('services');          // private: how they found CAS
            $t->boolean('recommend')->nullable()->after('found_us');
            $t->string('partner_since', 20)->nullable()->after('recommend');    // agent: year they began
            $t->string('students_referred', 20)->nullable()->after('partner_since'); // agent: range
        });
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->dropColumn(['photo_path', 'title', 'university', 'degree', 'program', 'intake_year', 'services', 'found_us', 'recommend', 'partner_since', 'students_referred']);
        });
    }
};
