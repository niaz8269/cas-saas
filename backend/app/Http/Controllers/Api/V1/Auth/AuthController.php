<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Issue a Sanctum token for a staff account.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'This account is inactive. Contact an administrator.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($request->input('device_name', 'cas-spa'));

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->load(['branch', 'department'])),
        ]);
    }

    /**
     * Revoke the token used for this request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * The authenticated staff member, with roles and permissions for the SPA.
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load(['branch', 'department']));
    }
}
