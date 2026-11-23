<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

/**
 * The document checklist every application is validated against. This is
 * configuration, not demo data, so it seeds independently of any sample
 * records. Idempotent by name.
 */
class DocumentTypeSeeder extends Seeder
{
    private const DOCUMENT_TYPES = [
        // name, category, sensitive, required_for
        ['Passport', 'identity', true, ['application']],
        ['Photo', 'identity', false, ['application']],
        ['High School Transcript', 'academic', false, ['application']],
        ['High School Diploma/Certificate', 'academic', false, ['application']],
        ['Medical Examination Form', 'medical', false, null],
        ['Police Clearance Certificate', 'identity', true, null],
        ['Bank Statement', 'financial', true, null],
        ['Degree Certificate', 'academic', false, null],
        ['CV / Resume', 'personal', false, null],
    ];

    public function run(): void
    {
        foreach (self::DOCUMENT_TYPES as [$name, $category, $sensitive, $requiredFor]) {
            DocumentType::firstOrCreate(['name' => $name], [
                'category' => $category,
                'is_sensitive' => $sensitive,
                'required_for' => $requiredFor,
            ]);
        }
    }
}
