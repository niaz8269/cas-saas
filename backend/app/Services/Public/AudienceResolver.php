<?php

namespace App\Services\Public;

use App\Models\Agent;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Resolves the "audience" for the public catalog from an OPTIONAL bearer
 * token — the public site sends the logged-in student/agent (or staff)
 * token when there is one. Guests (no/invalid token) are `public`. The
 * audience decides which fields the public resources reveal and which
 * service-charge rate a program's fee shows.
 */
class AudienceResolver
{
    public const AUDIENCES = ['public', 'student', 'agent', 'counselor'];

    public function resolve(Request $request): string
    {
        $bearer = $request->bearerToken();

        if ($bearer === null || $bearer === '') {
            return 'public';
        }

        $token = PersonalAccessToken::findToken($bearer);

        if ($token === null || ($token->expires_at !== null && $token->expires_at->isPast())) {
            return 'public';
        }

        return match (true) {
            $token->tokenable instanceof Student => 'student',
            $token->tokenable instanceof Agent => 'agent',
            $token->tokenable instanceof User => 'counselor', // any staff → internal view
            default => 'public',
        };
    }

    /** The service-charge applicant tier for an audience (staff see the student rate). */
    public function applicantRate(string $audience): string
    {
        return $audience === 'agent' ? 'agent' : 'student';
    }
}
