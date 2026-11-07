<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\Agent;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Forgot / reset password for the three account types (staff, agent, student).
 *
 * Tokens live in the stock `password_reset_tokens` table; the email key is
 * prefixed with the audience so the same address can exist as more than one
 * kind of account. Only a hash of the token is stored; links expire after 60
 * minutes and work once. "Forgot" always answers the same way, so it cannot be
 * used to find out which emails have an account.
 */
class PasswordResetController extends Controller
{
    private const MINUTES = 60;

    private const RESEND_AFTER_SECONDS = 60;

    /** @return array<string, class-string<Model>> */
    private function models(): array
    {
        return ['staff' => User::class, 'agent' => Agent::class, 'student' => Student::class];
    }

    private function key(string $audience, string $email): string
    {
        return $audience.':'.mb_strtolower(trim($email));
    }

    public function forgot(Request $request, string $audience): JsonResponse
    {
        $model = $this->models()[$audience] ?? abort(404);
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $email = mb_strtolower(trim($data['email']));
        $key = $this->key($audience, $email);

        $account = $model::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        $recent = DB::table('password_reset_tokens')->where('email', $key)
            ->where('created_at', '>', now()->subSeconds(self::RESEND_AFTER_SECONDS))->exists();

        if ($account && ! $recent) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $key],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $url = rtrim((string) config('app.frontend_url'), '/')
                .($audience === 'staff' ? '/admin/reset-password' : '/portal/reset-password')
                .'?'.http_build_query(['token' => $token, 'email' => $email, 'as' => $audience]);

            try {
                Mail::to($account->email)->send(new ResetPasswordMail(
                    (string) ($account->name ?? $account->full_name ?? $account->contact_name ?? $account->email),
                    $url,
                    self::MINUTES,
                ));
            } catch (\Throwable $e) {
                // The caller gets the same answer either way; the failure is for the operator.
                Log::warning('Password reset email failed', ['audience' => $audience, 'error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a reset link is on its way.',
        ]);
    }

    public function reset(Request $request, string $audience): JsonResponse
    {
        $model = $this->models()[$audience] ?? abort(404);
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $key = $this->key($audience, $email);

        $row = DB::table('password_reset_tokens')->where('email', $key)->first();
        $valid = $row
            && now()->subMinutes(self::MINUTES)->lt(Carbon::parse($row->created_at))
            && Hash::check($data['token'], $row->token);
        $account = $valid ? $model::query()->whereRaw('LOWER(email) = ?', [$email])->first() : null;

        if (! $account) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired. Request a new one.',
                'errors' => ['token' => ['This reset link is invalid or has expired.']],
                'code' => 'invalid_reset_token',
            ], 422);
        }

        $account->forceFill(['password' => $data['password']])->save();
        DB::table('password_reset_tokens')->where('email', $key)->delete();
        // Anyone still signed in with the old password must sign in again.
        if (method_exists($account, 'tokens')) {
            $account->tokens()->delete();
        }

        return response()->json(['message' => 'Your password has been changed. You can sign in now.']);
    }
}
