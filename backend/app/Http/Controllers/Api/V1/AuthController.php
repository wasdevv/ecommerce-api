<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return $this->tokenResponse(auth()->login($user), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! $token = auth()->attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        return $this->tokenResponse($token);
    }

    public function me(): UserResource
    {
        return new UserResource(auth()->user());
    }

    public function refresh(): JsonResponse
    {
        return $this->tokenResponse(auth()->refresh());
    }

    public function logout(): JsonResponse
    {
        auth()->logout(); // blacklists the token until it expires

        return response()->json(null, 204);
    }

    private function tokenResponse(string $token, int $status = 200): JsonResponse
    {
        return response()->json(['data' => [
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL() * 60,
            'user' => new UserResource(auth()->user()),
        ]], $status);
    }
}
