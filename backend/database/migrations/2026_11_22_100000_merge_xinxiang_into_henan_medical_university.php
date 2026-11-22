<?php

use App\Models\University;
use App\Services\Catalog\UniversityMerger;
use Illuminate\Database\Migrations\Migration;

/**
 * Xinxiang Medical University is now Henan Medical University. The catalog held both names as two records for
 * the same school (same website, same city). This moves everything onto the Henan Medical University record,
 * which already carries the new name and the Chinese name 河南医药大学, and soft-deletes the old one.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(UniversityMerger::class)->merge('xinxiang-medical-university', 'henan-medical-university');

        // Keep the old name findable: people still search for it.
        $new = University::where('slug', 'henan-medical-university')->first();
        if ($new && ! str_contains((string) $new->about, 'Xinxiang Medical University')) {
            $new->about = trim(rtrim((string) $new->about).' Formerly Xinxiang Medical University.');
            $new->save();
        }
    }

    public function down(): void
    {
        // The old record is only soft-deleted; restore it from the admin or with University::withTrashed()->restore().
        // The programs and intakes that moved are not moved back.
    }
};
