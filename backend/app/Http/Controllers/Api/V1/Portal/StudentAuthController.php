<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\Portal\StudentProfileResource;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StudentAuthController extends Controller
{
    /**
     * Issue a Sanctum token for an activated student portal account.
     * A NULL password (portal not activated) fails identically to a wrong
     * password — activation status is never revealed.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $student = Student::where('email', $request->string('email'))->first();

        if (! $student || $student->password === null
            || ! Hash::check($request->string('password'), $student->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (in_array($student->status, ['withdrawn', 'inactive'], true)) {
            return response()->json([
                'message' => 'This account is inactive. Contact your counselor.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        $student->forceFill(['last_login_at' => now()])->save();

        $token = $student->createToken($request->input('device_name', 'cas-student-portal'));

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'student' => new StudentProfileResource($student->load('country')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): StudentProfileResource
    {
        return new StudentProfileResource($request->user()->load('country'));
    }
}
