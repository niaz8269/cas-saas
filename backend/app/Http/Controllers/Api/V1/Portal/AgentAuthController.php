<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\Portal\AgentProfileResource;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AgentAuthController extends Controller
{
    /**
     * Issue a Sanctum token for an activated agent portal account.
     * A NULL password (portal not activated) fails identically to a wrong
     * password — activation status is never revealed.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $agent = Agent::where('email', $request->string('email'))->first();

        if (! $agent || $agent->password === null
            || ! Hash::check($request->string('password'), $agent->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if ($agent->status !== 'active') {
            return response()->json([
                'message' => 'This account is inactive. Contact your CAS coordinator.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        $agent->forceFill(['last_login_at' => now()])->save();

        $token = $agent->createToken($request->input('device_name', 'cas-agent-portal'));

        return response()->json([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'agent' => new AgentProfileResource($agent),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): AgentProfileResource
    {
        return new AgentProfileResource($request->user());
    }
}
