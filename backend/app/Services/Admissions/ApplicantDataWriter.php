<?php

namespace App\Services\Admissions;

use App\Http\Requests\Portal\Concerns\ValidatesApplicantData;
use App\Models\Student;

/**
 * Writes the applicant record — profile, guardians, prior education — onto a
 * student. Shared by every portal surface that captures it: the student and
 * agent apply wizards and the partner's "add student" form
 * ({@see ValidatesApplicantData}).
 *
 * Absent or empty collections mean "not supplied", never "delete what is
 * there". The apply wizards post guardians/education on every draft, so a
 * partner who filled them in at add-student time would otherwise lose them the
 * first time an application was started without re-typing them.
 */
class ApplicantDataWriter
{
    /**
     * @param  array<string, mixed>  $data  validated payload
     */
    public function write(Student $student, array $data): void
    {
        if (! empty($data['profile'])) {
            $student->fill($data['profile'])->save();
        }

        if (! empty($data['guardians'])) {
            $student->guardians()->delete();
            foreach ($data['guardians'] as $guardian) {
                $student->guardians()->create($guardian);
            }
        }

        if (! empty($data['education'])) {
            $student->education()->delete();
            foreach ($data['education'] as $entry) {
                $student->education()->create($entry);
            }
        }
    }
}
