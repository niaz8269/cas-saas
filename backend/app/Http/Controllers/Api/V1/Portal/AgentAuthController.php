<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Portal\AgentRegisterRequest;
use App\Http\Resources\Portal\AgentProfileResource;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AgentAuthController extends Controller
{
    /**
     * Public partner/agent registration. Creates a PENDING agent request for
     * admin review — no token is issued (the account can't sign in until an
     * admin approves it and its status becomes 'active').
     */
    public function register(AgentRegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $agent = new Agent([
            'agent_code' => Agent::nextCode(),
            'name' => $data['company_name'],
            'contact_name' => $data['contact_name'],
            'type' => 'partner',
            'email' => $data['email'],
            'phone' => $data['phone'],
            'website' => $data['website'],
            'address' => $data['address'],
            'country_id' => $data['country_id'],
            'status' => 'pending',
        ]);
        // password is guarded (not fillable); the cast hashes it on save.
        $agent->forceFill(['password' => $data['password']])->save();

        return response()->json([
            'message' => 'Your partner application has been received. Our team will review it and email you once it is approved.',
            'code' => 'PENDING_APPROVAL',
        ], 201);
    }

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
            $message = match ($agent->status) {
                'pending' => 'Your partner application is awaiting approval. We\'ll email you once it\'s reviewed.',
                'rejected' => 'Your partner application was not approved. Please contact CAS for details.',
                default => 'This account is inactive. Contact your CAS coordinator.',
            };

            return response()->json([
                'message' => $message,
                'code' => $agent->status === 'pending' ? 'PENDING_APPROVAL' : 'ACCOUNT_INACTIVE',
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
