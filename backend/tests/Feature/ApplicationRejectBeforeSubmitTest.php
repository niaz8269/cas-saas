<?php

use App\Models\Application;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

uses(RefreshDatabase::class);

const REJECT_PERMS = ['applications.view.global', 'applications.update.global'];

/*
 * CAS must be able to decline an application it is still reviewing — an
 * ineligible or failed-verification case — without first pushing it to the
 * university. Previously `rejected` was only reachable from submitted/offer.
 */

it('rejects an application still under review', function () {
    actingAsStaffWith(REJECT_PERMS);
    $application = Application::factory()->create(['status' => 'under_review']);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'rejected'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');
});

it('rejects an application awaiting documents', function () {
    actingAsStaffWith(REJECT_PERMS);
    $application = Application::factory()->create(['status' => 'documents_pending']);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'rejected'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');
});

it('still refuses to reject a draft (must go through review first)', function () {
    $application = Application::factory()->create(['status' => 'draft']);

    expect(fn () => app(ApplicationWorkflow::class)->transition($application, 'rejected', User::factory()->create()))
        ->toThrow(ConflictHttpException::class);
});
