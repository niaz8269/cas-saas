<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Portal\StudentRegisterRequest;
use App\Http\Resources\Portal\StudentProfileResource;
use App\Mail\VerifyStudentEmail;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class StudentAuthController extends Controller
{
    /**
     * Public self-registration: create an activated student portal account and
     * issue a token (the new student is signed in immediately). Email
     * uniqueness + password strength are enforced by StudentRegisterRequest.
     */
    public function register(StudentRegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $student = new Student([
            'student_code' => Student::nextCode(),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'country_id' => $data['country_id'] ?? null,
            'status' => 'active',
        ]);
        // password + last_login_at are guarded (not fillable); set explicitly.
        // The 'password' cast hashes it on save.
        $student->forceFill([
            'password' => $data['password'],
            'last_login_at' => now(),
        ])->save();

        $this->sendVerification($student);

        $token = $student->createToken($data['device_name'] ?? 'cas-student-portal');

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'student' => new StudentProfileResource($student->load('country')),
        ], 201);
    }

    /**
     * Confirm a student's email via the signed link in their verification
     * email. The `signed` middleware guarantees the URL (id + hash) is
     * untampered; the hash additionally detects an email change since issue.
     */
    public function verify(Request $request, int $id, string $hash): Response
    {
        $student = Student::find($id);

        abort_if($student === null || ! hash_equals($student->verificationHash(), $hash), 403, 'Invalid or expired verification link.');

        if (! $student->hasVerifiedEmail()) {
            $student->markEmailAsVerified();
        }

        return response($this->verifiedPage())->header('Content-Type', 'text/html');
    }

    /** Re-send the verification email to the authenticated student. */
    public function resendVerification(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        if ($student->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email is already verified.']);
        }

        $this->sendVerification($student);

        return response()->json(['message' => 'Verification email sent.']);
    }

    private function sendVerification(Student $student): void
    {
        if ($student->hasVerifiedEmail()) {
            return;
        }

        $url = URL::temporarySignedRoute('student.verify', now()->addMinutes(60), [
            'id' => $student->id,
            'hash' => $student->verificationHash(),
        ]);

        Mail::to($student->email)->send(new VerifyStudentEmail($student, $url));
    }

    private function verifiedPage(): string
    {
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Email verified</title>'
            .'<meta name="viewport" content="width=device-width, initial-scale=1">'
            .'<style>body{font-family:system-ui,"Segoe UI",sans-serif;background:#F6F8FC;color:#1F2933;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}'
            .'.card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:32px 40px;text-align:center;max-width:360px}'
            .'h1{color:#14357C;font-size:20px;margin:0 0 8px}p{color:#64748B;font-size:14px;margin:0}</style></head>'
            .'<body><div class="card"><h1>Email verified &#10003;</h1><p>Your CAS email address is confirmed. You can return to the app.</p></div></body></html>';
    }

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
