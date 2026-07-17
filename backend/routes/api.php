<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    // Staff-authenticated
    Route::middleware('auth:staff')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:users.manage.global,staff');
    });
});
