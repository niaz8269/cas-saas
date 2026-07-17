<?php

use App\Http\Controllers\Api\V1\AgentPayableController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\CommissionController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\Ingest\LeadIngestController;
use App\Http\Controllers\Api\V1\IntakeController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\Portal\AgentAuthController;
use App\Http\Controllers\Api\V1\Portal\AgentPortalController;
use App\Http\Controllers\Api\V1\Portal\StudentAuthController;
use App\Http\Controllers\Api\V1\ScholarshipController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\UniversityAgreementController;
use App\Http\Controllers\Api\V1\UniversityContactController;
use App\Http\Controllers\Api\V1\UniversityController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\VisaCaseController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    // Lead ingestion (per-source API keys; idempotent; rate-limited per key)
    Route::post('ingest/leads', LeadIngestController::class)
        ->middleware('api-source');

    // Agent portal (own records only — report §5.7)
    Route::prefix('agent')->group(function () {
        Route::post('auth/login', [AgentAuthController::class, 'login'])
            ->middleware('throttle:login');

        Route::middleware('auth:agent')->group(function () {
            Route::post('auth/logout', [AgentAuthController::class, 'logout']);
            Route::get('auth/me', [AgentAuthController::class, 'me']);
            Route::get('students', [AgentPortalController::class, 'students']);
            Route::get('applications', [AgentPortalController::class, 'applications']);
            Route::get('commissions', [AgentPortalController::class, 'commissions']);
        });
    });

    // Student portal (own records only — report §5.11)
    Route::prefix('student')->group(function () {
        Route::post('auth/login', [StudentAuthController::class, 'login'])
            ->middleware('throttle:login');

        Route::middleware('auth:student')->group(function () {
            Route::post('auth/logout', [StudentAuthController::class, 'logout']);
            Route::get('auth/me', [StudentAuthController::class, 'me']);
        });
    });

    // Staff-authenticated
    Route::middleware('auth:staff')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:users.manage.global,staff');

        // CRM (record-scoped via policies + visibleTo query scopes)
        Route::get('leads', [LeadController::class, 'index']);
        Route::get('leads/{lead}', [LeadController::class, 'show']);
        Route::patch('leads/{lead}', [LeadController::class, 'update']);
        Route::post('leads/{lead}/assign', [LeadController::class, 'assign']);
        Route::post('leads/{lead}/convert', [LeadController::class, 'convert']);
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{student}', [StudentController::class, 'show']);
        Route::patch('students/{student}', [StudentController::class, 'update']);
        Route::get('students/{student}/timeline', [StudentController::class, 'timeline']);
        Route::post('students/{student}/notes', [StudentController::class, 'addNote']);

        // Admissions
        Route::get('applications', [ApplicationController::class, 'index']);
        Route::post('applications', [ApplicationController::class, 'store']);
        Route::get('applications/{application}', [ApplicationController::class, 'show']);
        Route::patch('applications/{application}', [ApplicationController::class, 'update']);
        Route::post('applications/{application}/transition', [ApplicationController::class, 'transition']);
        Route::post('applications/{application}/offers', [ApplicationController::class, 'storeOffer']);
        Route::get('applications/{application}/documents', [DocumentController::class, 'forApplication']);

        // Documents (pre-signed, access-logged)
        Route::get('document-types', [DocumentController::class, 'types']);
        Route::post('documents/presign', [DocumentController::class, 'presign']);
        Route::post('documents', [DocumentController::class, 'store']);
        Route::get('documents/{document}/download', [DocumentController::class, 'download']);
        Route::post('documents/{document}/verify', [DocumentController::class, 'verify']);
        Route::post('documents/{document}/reject', [DocumentController::class, 'reject']);

        // Finance & commission
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'storePayment']);
        Route::get('commissions', [CommissionController::class, 'index']);
        Route::get('commissions/{commission}', [CommissionController::class, 'show']);
        Route::post('commissions/{commission}/transition', [CommissionController::class, 'transition']);
        Route::get('agent-payables', [AgentPayableController::class, 'index']);
        Route::post('agent-payables/{payable}/pay', [AgentPayableController::class, 'pay']);

        // Visa
        Route::get('visa-cases', [VisaCaseController::class, 'index']);
        Route::get('visa-cases/{visaCase}', [VisaCaseController::class, 'show']);
        Route::post('visa-cases/{visaCase}/transition', [VisaCaseController::class, 'transition']);
        Route::post('visa-cases/{visaCase}/assign', [VisaCaseController::class, 'assign']);
        Route::patch('visa-cases/{visaCase}/checklist/{item}', [VisaCaseController::class, 'updateChecklistItem']);

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
