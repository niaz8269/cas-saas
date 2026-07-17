<?php

use App\Models\Application;
use App\Models\Offer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const OFFER_RESPOND_PERMS = ['applications.view.global', 'applications.update.global'];

function respond(int $applicationId, int $offerId, array $payload)
{
    return test()->postJson("/api/v1/applications/{$applicationId}/offers/{$offerId}/respond", $payload);
}

it('accepts an offer and advances an awaiting application', function () {
    actingAsStaffWith(OFFER_RESPOND_PERMS);
    $application = Application::factory()->create(['status' => 'offer_received']);
    $offer = Offer::factory()->for($application)->create(['status' => 'issued']);

    respond($application->id, $offer->id, ['decision' => 'accepted'])
        ->assertOk()
        ->assertJsonPath('data.status', 'accepted');

    expect($offer->fresh()->status)->toBe('accepted')
        ->and($application->fresh()->status)->toBe('accepted');
});

it('declines an offer without transitioning the application', function () {
    actingAsStaffWith(OFFER_RESPOND_PERMS);
    $application = Application::factory()->create(['status' => 'offer_received']);
    $offer = Offer::factory()->for($application)->create(['status' => 'issued']);

    respond($application->id, $offer->id, ['decision' => 'declined'])
        ->assertOk()
        ->assertJsonPath('data.status', 'declined');

    expect($offer->fresh()->status)->toBe('declined')
        ->and($application->fresh()->status)->toBe('offer_received');
});

it('409s when responding to an already-resolved offer', function () {
    actingAsStaffWith(OFFER_RESPOND_PERMS);
    $application = Application::factory()->create(['status' => 'offer_received']);
    $offer = Offer::factory()->for($application)->create(['status' => 'accepted']);

    respond($application->id, $offer->id, ['decision' => 'declined'])->assertStatus(409);
});

it('denies offer responses to view-only staff', function () {
    actingAsStaffWith(['applications.view.global']);
    $application = Application::factory()->create(['status' => 'offer_received']);
    $offer = Offer::factory()->for($application)->create(['status' => 'issued']);

    respond($application->id, $offer->id, ['decision' => 'accepted'])->assertStatus(403);
});

it('validates the decision value', function () {
    actingAsStaffWith(OFFER_RESPOND_PERMS);
    $application = Application::factory()->create(['status' => 'offer_received']);
    $offer = Offer::factory()->for($application)->create(['status' => 'issued']);

    respond($application->id, $offer->id, ['decision' => 'maybe'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['decision']);
});
