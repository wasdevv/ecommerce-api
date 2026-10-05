<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_a_token_for_a_customer(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'secret-123', 'password_confirmation' => 'secret-123',
        ])
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'customer')
            ->assertJsonStructure(['data' => ['token', 'expires_in']]);
    }

    public function test_register_cannot_choose_its_own_role(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Eve', 'email' => 'eve@example.com', 'password' => 'secret-123', 'password_confirmation' => 'secret-123', 'role' => 'admin',
        ])->assertJsonPath('data.user.role', 'customer');
    }

    public function test_login_and_me(): void
    {
        $user = User::factory()->create(['password' => 'secret-123']);

        $token = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret-123'])
            ->assertOk()->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me')
            ->assertOk()->assertJsonPath('data.email', $user->email);
    }

    public function test_wrong_password_is_401(): void
    {
        $user = User::factory()->create(['password' => 'secret-123']);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'nope'])->assertUnauthorized();
    }

    public function test_garbage_token_is_401(): void
    {
        $this->withHeader('Authorization', 'Bearer not-a-jwt')->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_expired_token_is_401(): void
    {
        $user = User::factory()->create();
        $this->asUser($user);

        $this->travel(61)->minutes();

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_logout_revokes_the_token(): void
    {
        $token = auth('api')->login(User::factory()->create());

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/auth/logout')->assertNoContent();
        auth('api')->forgetUser();

        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
