<?php

namespace App\Services\Leads;

use App\Models\Lead;
use App\Models\Student;

/**
 * Duplicate detection per Technical Report §5.2:
 * exact match on normalized email / phone (E.164) / passport number;
 * probable match on name (+ DOB when provided) routed to admin review.
 */
class DuplicateDetector
{
    public function normalizeEmail(?string $email): ?string
    {
        $email = $email !== null ? mb_strtolower(trim($email)) : null;

        return $email !== '' ? $email : null;
    }

    public function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/[^0-9+]/', '', $phone) ?? '';

        return $digits !== '' ? $digits : null;
    }

    public function normalizePassport(?string $passport): ?string
    {
        if ($passport === null) {
            return null;
        }

        $clean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $passport) ?? '');

        return $clean !== '' ? $clean : null;
    }

    /**
     * Exact identity match against the permanent student registry.
     */
    public function findExactStudent(?string $email, ?string $phone, ?string $passport): ?Student
    {
        if ($email === null && $phone === null && $passport === null) {
            return null;
        }

        return Student::query()
            ->where(function ($query) use ($email, $phone, $passport) {
                if ($email !== null) {
                    $query->orWhereRaw('LOWER(email) = ?', [$email]);
                }
                if ($phone !== null) {
                    $query->orWhere('phone', $phone);
                }
                if ($passport !== null) {
                    $query->orWhere('passport_no', $passport);
                }
            })
            ->first();
    }

    /**
     * Exact match against open leads (duplicates chain to the original).
     */
    public function findExactLead(?string $email, ?string $phone, ?string $passport): ?Lead
    {
        if ($email === null && $phone === null && $passport === null) {
            return null;
        }

        return Lead::query()
            ->where('status', '!=', 'duplicate')
            ->where(function ($query) use ($email, $phone, $passport) {
                if ($email !== null) {
                    $query->orWhereRaw('LOWER(email) = ?', [$email]);
                }
                if ($phone !== null) {
                    $query->orWhere('phone', $phone);
                }
                if ($passport !== null) {
                    $query->orWhere('passport_no', $passport);
                }
            })
            ->orderBy('id')
            ->first();
    }

    /**
     * Probable student match: same full name (case-insensitive), plus DOB
     * when supplied. Not authoritative — routed to review, never auto-linked.
     */
    public function findProbableStudent(?string $firstName, ?string $lastName, ?string $dob = null): ?Student
    {
        if (! $firstName || ! $lastName) {
            return null;
        }

        return Student::query()
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($firstName))])
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($lastName))])
            ->when($dob, fn ($query) => $query->whereDate('dob', $dob))
            ->first();
    }
}
