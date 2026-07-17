<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\Ingest\LeadIngestController;
use App\Http\Controllers\Api\V1\IntakeController;
use App\Http\Controllers\Api\V1\ScholarshipController;
use App\Http\Controllers\Api\V1\UniversityAgreementController;
use App\Http\Controllers\Api\V1\UniversityContactController;
use App\Http\Controllers\Api\V1\UniversityController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    // Lead ingestion (per-source API keys; idempotent; rate-limited per key)
    Route::post('ingest/leads', LeadIngestController::class)
        ->middleware('api-source');

    // Staff-authenticated
    Route::middleware('auth:staff')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:users.manage.global,staff');

        // Catalog (policy-authorized in controllers)
        Route::apiResource('universities', UniversityController::class);
        Route::get('universities/{university}/contacts', [UniversityContactController::class, 'index']);
        Route::post('universities/{university}/contacts', [UniversityContactController::class, 'store']);
        Route::patch('contacts/{contact}', [UniversityContactController::class, 'update']);
        Route::delete('contacts/{contact}', [UniversityContactController::class, 'destroy']);
        Route::apiResource('courses', CourseController::class);
        Route::apiResource('intakes', IntakeController::class);
        Route::apiResource('scholarships', ScholarshipController::class);
        Route::apiResource('agreements', UniversityAgreementController::class)
            ->parameters(['agreements' => 'agreement']);
    });
});
