<?php

use App\Http\Controllers\Api\V1\AgentPayableController;
use App\Http\Controllers\Api\V1\ApiSourceController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\AutomationRuleController;
use App\Http\Controllers\Api\V1\CommissionController;
use App\Http\Controllers\Api\V1\CommunicationController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\ErrorLogController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\Ingest\IngestApplicationController;
use App\Http\Controllers\Api\V1\Ingest\LeadIngestController;
use App\Http\Controllers\Api\V1\IntakeController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\MessageTemplateController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\Portal\AgentAuthController;
use App\Http\Controllers\Api\V1\Portal\AgentPortalController;
use App\Http\Controllers\Api\V1\Portal\StudentApplicationController;
use App\Http\Controllers\Api\V1\Portal\StudentAuthController;
use App\Http\Controllers\Api\V1\Portal\StudentDocumentController;
use App\Http\Controllers\Api\V1\Portal\StudentPortalController;
use App\Http\Controllers\Api\V1\ProgramController;
use App\Http\Controllers\Api\V1\Public\PublicCatalogController;
use App\Http\Controllers\Api\V1\Public\PublicEnquiryController;
use App\Http\Controllers\Api\V1\ScholarshipController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\UniversityAgreementController;
use App\Http\Controllers\Api\V1\UniversityContactController;
use App\Http\Controllers\Api\V1\UniversityController;
use App\Http\Controllers\Api\V1\UploadController;
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

    // Direct university-admission application ingestion (partner sites)
    Route::post('ingest/applications', IngestApplicationController::class)
        ->middleware('api-source');

    // Public website catalog (unauthenticated, active/published only, throttled)
    Route::prefix('public')->middleware('throttle:public')->group(function () {
        Route::get('universities', [PublicCatalogController::class, 'universities']);
        Route::get('programs', [PublicCatalogController::class, 'programs']);
        Route::get('scholarships', [PublicCatalogController::class, 'scholarships']);
        Route::get('universities/{slug}', [PublicCatalogController::class, 'university']);
    });

    // Public website enquiry form → lead (tighter throttle)
    Route::post('public/enquiries', [PublicEnquiryController::class, 'store'])
        ->middleware('throttle:enquiry');

    // Client-side (browser) error reporting from the SPA — any authenticated user.
    Route::post('client-errors', [ErrorLogController::class, 'storeClient'])
        ->middleware(['auth:staff,agent,student', 'throttle:30,1']);

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
            Route::get('commissions/statement', [AgentPortalController::class, 'statement']);
        });
    });

    // Student portal (own records only — report §5.11)
    Route::prefix('student')->group(function () {
        Route::post('auth/login', [StudentAuthController::class, 'login'])
            ->middleware('throttle:login');

        Route::middleware('auth:student')->group(function () {
            Route::post('auth/logout', [StudentAuthController::class, 'logout']);
            Route::get('auth/me', [StudentAuthController::class, 'me']);
            // Application wizard — browsing (static segments precede any
            // future applications/{application} routes).
            Route::get('countries', [StudentApplicationController::class, 'countries']);
            Route::get('majors', [StudentApplicationController::class, 'majors']);
            Route::get('government-scholarships', [StudentApplicationController::class, 'governmentScholarships']);
            Route::post('scholarship-applications', [StudentApplicationController::class, 'storeScholarshipApplication']);
            Route::get('applications/funding-options', [StudentApplicationController::class, 'fundingOptions']);
            Route::get('applications/availability', [StudentApplicationController::class, 'availability']);
            Route::get('applications/required-documents', [StudentApplicationController::class, 'requiredDocuments']);
            Route::post('applications', [StudentApplicationController::class, 'store']);
            Route::post('applications/{application}/documents/presign', [StudentApplicationController::class, 'presignDocument']);
            Route::post('applications/{application}/documents', [StudentApplicationController::class, 'storeDocument']);
            Route::post('applications/{application}/submit', [StudentApplicationController::class, 'submit']);
            Route::get('applications', [StudentPortalController::class, 'applications']);
            Route::get('visa-case', [StudentPortalController::class, 'visaCase']);
            Route::get('invoices', [StudentPortalController::class, 'invoices']);
            Route::get('invoices/{invoice}/pdf', [StudentPortalController::class, 'invoicePdf']);
            Route::get('documents', [StudentPortalController::class, 'documents']);
            Route::get('document-types', [StudentPortalController::class, 'documentTypes']);
            Route::post('documents/presign', [StudentDocumentController::class, 'presign']);
            Route::post('documents', [StudentDocumentController::class, 'store']);
            Route::get('documents/{document}/download', [StudentDocumentController::class, 'download']);
        });
    });

    // Staff-authenticated
    Route::middleware('auth:staff')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Analytics
        Route::get('search', [SearchController::class, 'index']);
        Route::get('dashboards/executive', [DashboardController::class, 'executive']);
        Route::get('reports/performance', [DashboardController::class, 'performance']);

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:users.manage.global,staff');

        // Automation rules + message templates (read-only; admin settings)
        Route::get('automation-rules', [AutomationRuleController::class, 'index'])
            ->middleware('permission:settings.manage.global,staff');
        Route::get('message-templates', [MessageTemplateController::class, 'index'])
            ->middleware('permission:settings.manage.global,staff');
        Route::post('message-templates/{template}/test', [MessageTemplateController::class, 'test'])
            ->middleware('permission:settings.manage.global,staff');

        // Integrations — ingestion sources + their API keys
        Route::apiResource('api-sources', ApiSourceController::class)
            ->except(['show'])
            ->parameters(['api-sources' => 'apiSource'])
            ->middleware('permission:settings.manage.global,staff');
        Route::post('api-sources/{apiSource}/keys', [ApiSourceController::class, 'storeKey'])
            ->middleware('permission:settings.manage.global,staff');
        Route::delete('api-sources/{apiSource}/keys/{apiKey}', [ApiSourceController::class, 'destroyKey'])
            ->middleware('permission:settings.manage.global,staff');

        // Audit trail (admin/compliance)
        Route::get('audit-logs', [AuditLogController::class, 'index'])
            ->middleware('permission:users.manage.global,staff');

        // Error monitor (admin/ops)
        Route::get('error-logs', [ErrorLogController::class, 'index'])
            ->middleware('permission:settings.manage.global,staff');
        Route::get('error-logs/{errorLog}', [ErrorLogController::class, 'show'])
            ->middleware('permission:settings.manage.global,staff');
        Route::post('error-logs/{errorLog}/resolve', [ErrorLogController::class, 'resolve'])
            ->middleware('permission:settings.manage.global,staff');

        // Catalog image upload (WebP conversion) — catalog managers
        Route::post('uploads/images', [UploadController::class, 'image'])
            ->middleware('permission:universities.manage.global|scholarships.manage.global,staff');

        // In-app notifications (own feed)
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

        // Follow-up tasks (own — assigned to or created by the user)
        Route::get('tasks', [TaskController::class, 'index']);
        Route::post('tasks', [TaskController::class, 'store']);
        Route::patch('tasks/{task}', [TaskController::class, 'update']);

        // CRM (record-scoped via policies + visibleTo query scopes)
        Route::get('leads', [LeadController::class, 'index']);
        Route::get('leads/export', [LeadController::class, 'export']); // before {lead}
        Route::get('leads/sources', [LeadController::class, 'sources']);
        Route::post('leads', [LeadController::class, 'store']);
        Route::get('leads/{lead}', [LeadController::class, 'show']);
        Route::patch('leads/{lead}', [LeadController::class, 'update']);
        Route::post('leads/{lead}/assign', [LeadController::class, 'assign']);
        Route::post('leads/{lead}/convert', [LeadController::class, 'convert']);
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{student}', [StudentController::class, 'show']);
        Route::patch('students/{student}', [StudentController::class, 'update']);
        Route::get('students/{student}/timeline', [StudentController::class, 'timeline']);
        Route::get('students/{student}/tasks', [StudentController::class, 'tasks']);
        Route::post('students/{student}/notes', [StudentController::class, 'addNote']);
        Route::get('students/{student}/documents', [DocumentController::class, 'forStudent']);
        Route::get('students/{student}/communications', [CommunicationController::class, 'index']);
        Route::post('students/{student}/communications', [CommunicationController::class, 'store']);
        Route::post('students/{student}/guardians', [GuardianController::class, 'store']);
        Route::patch('students/{student}/guardians/{guardian}', [GuardianController::class, 'update']);
        Route::delete('students/{student}/guardians/{guardian}', [GuardianController::class, 'destroy']);

        // Admissions
        Route::get('applications', [ApplicationController::class, 'index']);
        Route::get('applications/export', [ApplicationController::class, 'export']); // before {application}
        Route::post('applications', [ApplicationController::class, 'store']);
        Route::get('applications/{application}', [ApplicationController::class, 'show']);
        Route::patch('applications/{application}', [ApplicationController::class, 'update']);
        Route::post('applications/{application}/transition', [ApplicationController::class, 'transition']);
        Route::post('applications/{application}/offers', [ApplicationController::class, 'storeOffer']);
        Route::post('applications/{application}/offers/{offer}/respond', [ApplicationController::class, 'respondToOffer']);
        Route::get('applications/{application}/offers/{offer}/letter', [ApplicationController::class, 'offerLetter']);
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
        // Static segments before the {invoice} wildcard.
        Route::get('invoices/export', [InvoiceController::class, 'export']);
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::get('invoices/fee-schedule', [InvoiceController::class, 'feeSchedule']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
        Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'storePayment']);
        Route::get('commissions', [CommissionController::class, 'index']);
        Route::get('commissions/{commission}', [CommissionController::class, 'show']);
        Route::post('commissions/{commission}/transition', [CommissionController::class, 'transition']);
        Route::get('agent-payables', [AgentPayableController::class, 'index']);
        Route::post('agent-payables/{payable}/pay', [AgentPayableController::class, 'pay']);

        // Visa
        Route::get('visa-cases', [VisaCaseController::class, 'index']);
        Route::get('visa-officers', [VisaCaseController::class, 'assignableOfficers']);
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
        Route::apiResource('programs', ProgramController::class);
        Route::apiResource('intakes', IntakeController::class);
        Route::apiResource('scholarships', ScholarshipController::class);
        Route::apiResource('agreements', UniversityAgreementController::class)
            ->parameters(['agreements' => 'agreement']);
    });
});
