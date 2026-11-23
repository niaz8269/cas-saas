<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

/**
 * The document checklist of an ordinary application (self-funded or scholarship), by degree level.
 *
 * Bachelor applications ask for the 'application_bachelor' set; Master and PhD applications for the
 * 'application_postgraduate' set, with the experience letter and research papers listed as extra
 * ('application_postgraduate_optional'). The order they are shown in is fixed in ApplicationCatalog.
 *
 * Idempotent: a type that already exists (by name) keeps its other contexts, and its instruction is only filled in
 * when empty (or when it still holds a wording this seeder wrote earlier). Types that were named differently before
 * are renamed in place, so the files already uploaded stay attached to them.
 * Run: php artisan db:seed --class=ApplicationDocumentsSeeder
 */
class ApplicationDocumentsSeeder extends Seeder
{
    private const BACHELOR = 'application_bachelor';

    private const POSTGRADUATE = 'application_postgraduate';

    private const POSTGRADUATE_OPTIONAL = 'application_postgraduate_optional';

    /** Old name => new name. Renamed only when the new name is not taken yet. */
    private const RENAMES = [
        'Passport Photo' => 'Photo',
        'School Leaving Certificate' => 'High School Diploma/Certificate',
        'Academic Transcript' => 'High School Transcript',
        'Language Proficiency Certificate' => 'English Proficiency Certificate',
        'Study Plan / Statement of Purpose' => 'Study Plan',
        'CSCA Score Report' => 'CSCA',
    ];

    /** A type created by an earlier version of this seeder that nothing uses any more. */
    private const RETIRED = ['Notarized High School Diploma'];

    /** Instruction wordings an earlier version of this seeder wrote, so they may be replaced. */
    private const OLD_INSTRUCTIONS = [
        'Copy of the passport home (photo) page. For a Master or PhD application the passport must be valid for more than 1.5 years and have two blank visa pages.',
        'Passport-size photograph, clear, on a white background.',
        'HSK, IELTS, or an English proficiency certificate.',
        'Your academic transcripts / mark sheets.',
        'Your study plan / statement of purpose.',
    ];

    /** name, category, sensitive, contexts, instruction */
    private const TYPES = [
        ['Photo', 'identity', false, [self::BACHELOR, self::POSTGRADUATE], 'Passport-size photograph, clear, on a white background.'],
        ['Passport', 'identity', true, [self::BACHELOR, self::POSTGRADUATE], 'Copy of the passport home (photo) page. The passport should be valid for more than 1.5 years.'],
        ['Passport Blank Visa Page', 'identity', false, [self::BACHELOR, self::POSTGRADUATE], 'The two blank visa pages of your passport.'],
        ['High School Diploma/Certificate', 'academic', false, [self::BACHELOR], 'Your high school diploma / certificate.'],
        ['High School Transcript', 'academic', false, [self::BACHELOR], 'Your high school transcript / mark sheet.'],
        ['Medical Examination Form', 'medical', false, [self::BACHELOR, self::POSTGRADUATE], 'The foreigner physical examination form (medical report).'],
        ['Police Clearance Certificate', 'identity', true, [self::BACHELOR, self::POSTGRADUATE], 'Police no-criminal-record certificate.'],
        ['English Proficiency Certificate', 'academic', false, [self::BACHELOR], 'Your English proficiency certificate (or an HSK certificate).'],
        ['Study Plan', 'personal', false, [self::BACHELOR], 'Your study plan / statement of purpose.'],
        ['CSCA', 'academic', false, [self::BACHELOR], 'Score report of the CSC Aptitude Test (CSCA).'],
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
        foreach (self::RENAMES as $old => $new) {
            $type = DocumentType::where('name', $old)->first();

            if ($type !== null && ! DocumentType::where('name', $new)->exists()) {
                $type->update(['name' => $new]);
            }
        }

        foreach (self::RETIRED as $name) {
            $type = DocumentType::where('name', $name)->withCount('documents')->first();

            if ($type !== null && $type->documents_count === 0) {
                $type->delete();
            }
        }

        foreach (self::TYPES as [$name, $category, $sensitive, $contexts, $instruction]) {
            $type = DocumentType::firstOrNew(['name' => $name]);

            if (! $type->exists) {
                $type->category = $category;
                $type->is_sensitive = $sensitive;
            }

            $type->required_for = array_values(array_unique([...($type->required_for ?? []), ...$contexts]));

            if ($type->instruction === null || in_array($type->instruction, self::OLD_INSTRUCTIONS, true)) {
                $type->instruction = $instruction;
            }

            $type->save();
        }
    }
}
