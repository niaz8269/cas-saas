<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

/**
 * The document checklist for a Master's / PhD scholarship application.
 *
 * Registered under two contexts: 'scholarship_postgraduate' (required) and 'scholarship_postgraduate_optional'
 * (shown, never blocking). Idempotent: a type that already exists (by name) keeps its other contexts, and its
 * instruction is only filled in when empty. Run: php artisan db:seed --class=PostgraduateScholarshipDocumentsSeeder
 */
class PostgraduateScholarshipDocumentsSeeder extends Seeder
{
    private const REQUIRED = 'scholarship_postgraduate';

    private const OPTIONAL = 'scholarship_postgraduate_optional';

    /** name, category, sensitive, context, instruction */
    private const TYPES = [
        ['Notarized Degree Certificates', 'academic', false, self::REQUIRED, 'Notarized copies of every degree you already hold.'],
        ['Notarized Final Transcripts', 'academic', false, self::REQUIRED, 'Notarized final transcript or marks sheet for every degree you hold.'],
        ['English Proficiency Letter', 'academic', false, self::REQUIRED, 'A letter that shows your English proficiency.'],
        ['Recommendation Letters', 'personal', false, self::REQUIRED, 'Two recommendation letters.'],
        ['Study Plan / Personal Statement', 'personal', false, self::REQUIRED, 'Master: 800-1000 words. PhD: 1000-1500 words.'],
        ['Medical Examination Form', 'medical', false, self::REQUIRED, 'The physical examination form.'],
        ['CV / Resume', 'personal', false, self::REQUIRED, null],
        ['Police Clearance Certificate', 'identity', true, self::REQUIRED, 'Police no-criminal-record certificate.'],
        ['Experience Letter', 'personal', false, self::OPTIONAL, 'If you have one.'],
        ['Research Papers / Thesis', 'academic', false, self::OPTIONAL, 'Any thesis, research articles or papers, if you have them.'],
    ];

    public function run(): void
    {
        foreach (self::TYPES as [$name, $category, $sensitive, $context, $instruction]) {
            $type = DocumentType::firstOrNew(['name' => $name]);

            if (! $type->exists) {
                $type->category = $category;
                $type->is_sensitive = $sensitive;
            }

            $type->required_for = array_values(array_unique([...($type->required_for ?? []), $context]));
            $type->instruction ??= $instruction;
            $type->save();
        }
    }
}
