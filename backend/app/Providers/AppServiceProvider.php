<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Super Admin bypasses all permission checks (deny-by-default for
        // everyone else). Returning null lets normal policy evaluation run.
        Gate::before(function ($user, string $ability) {
            return $user instanceof User && $user->hasRole('Super Admin')
                ? true
                : null;
        });

        // Brute-force protection on login: 5 attempts/minute per email+IP.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(
                strtolower((string) $request->input('email')).'|'.$request->ip(),
            );
        });
    }
}
