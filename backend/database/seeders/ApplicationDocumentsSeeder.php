<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

/**
 * The document checklist of an ordinary application (self-funded or scholarship), by degree level.
 *
 * Bachelor applications ask for the 'application_bachelor' set; Master and PhD applications for the
 * 'application_postgraduate' set, with the experience letter and research papers listed as optional
 * ('application_postgraduate_optional'). Idempotent: a type that already exists (by name) keeps its other contexts,
 * and its instruction is only filled in when empty.
 * Run: php artisan db:seed --class=ApplicationDocumentsSeeder
 */
class ApplicationDocumentsSeeder extends Seeder
{
    private const BACHELOR = 'application_bachelor';

    private const POSTGRADUATE = 'application_postgraduate';

    private const POSTGRADUATE_OPTIONAL = 'application_postgraduate_optional';

    private const PASSPORT = 'Copy of the passport home (photo) page. For a Master or PhD application the passport must be valid for more than 1.5 years and have two blank visa pages.';

    private const PHOTO = 'Passport-size photograph, clear, on a white background.';

    /** name, category, sensitive, contexts, instruction */
    private const TYPES = [
        ['Passport', 'identity', true, [self::BACHELOR, self::POSTGRADUATE], self::PASSPORT],
        ['Passport Photo', 'identity', false, [self::BACHELOR, self::POSTGRADUATE], self::PHOTO],
        ['Notarized High School Diploma', 'academic', false, [self::BACHELOR], 'Notarized copy of your high school diploma, or the equivalent graduation certificate.'],
        ['Academic Transcript', 'academic', false, [self::BACHELOR], 'Your academic transcripts / mark sheets.'],
        ['Study Plan / Statement of Purpose', 'personal', false, [self::BACHELOR], 'Your study plan / statement of purpose.'],
        ['Medical Examination Form', 'medical', false, [self::BACHELOR, self::POSTGRADUATE], 'The foreigner physical examination form (medical report).'],
        ['Police Clearance Certificate', 'identity', true, [self::BACHELOR, self::POSTGRADUATE], 'Police no-criminal-record certificate.'],
        ['Language Proficiency Certificate', 'academic', false, [self::BACHELOR], 'HSK, IELTS, or an English proficiency certificate.'],
        ['CSCA Score Report', 'academic', false, [self::BACHELOR], 'Score report of the CSC Aptitude Test (CSCA).'],
        ['Notarized Degree Certificates', 'academic', false, [self::POSTGRADUATE], 'Notarized copies of every degree you already hold.'],
        ['Notarized Final Transcripts', 'academic', false, [self::POSTGRADUATE], 'Notarized final transcript or marks sheet for every degree you hold.'],
        ['English Proficiency Letter', 'academic', false, [self::POSTGRADUATE], 'A letter that shows your English proficiency.'],
        ['Recommendation Letters', 'personal', false, [self::POSTGRADUATE], 'Two recommendation letters.'],
        ['Study Plan / Personal Statement', 'personal', false, [self::POSTGRADUATE], 'Master: 800-1000 words. PhD: 1000-1500 words.'],
        ['CV / Resume', 'personal', false, [self::POSTGRADUATE], 'Your resume (CV).'],
        ['Experience Letter', 'personal', false, [self::POSTGRADUATE_OPTIONAL], 'If you have one.'],
        ['Research Papers / Thesis', 'academic', false, [self::POSTGRADUATE_OPTIONAL], 'Any thesis, research articles or papers, if you have them.'],
    ];

    public function run(): void
    {
        foreach (self::TYPES as [$name, $category, $sensitive, $contexts, $instruction]) {
            $type = DocumentType::firstOrNew(['name' => $name]);

            if (! $type->exists) {
                $type->category = $category;
                $type->is_sensitive = $sensitive;
            }

            $type->required_for = array_values(array_unique([...($type->required_for ?? []), ...$contexts]));
            $type->instruction ??= $instruction;
            $type->save();
        }
    }
}
