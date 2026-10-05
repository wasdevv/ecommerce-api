<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Real JWT through the real guard: the header is what the frontend sends. */
    protected function asUser(User $user): static
    {
        $token = auth('api')->login($user);
        // login() caches the user on the guard; forget it so every request is authenticated by the token alone.
        auth('api')->forgetUser();

        return $this->withHeader('Authorization', "Bearer {$token}");
    }
}
