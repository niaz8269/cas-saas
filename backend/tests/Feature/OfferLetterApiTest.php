<?php

use App\Models\Application;
use App\Models\Offer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('streams a branded offer letter pdf to an authorized viewer', function () {
    actingAsStaffWith(['applications.view.global']);
    $application = Application::factory()->create();
    $offer = Offer::factory()->for($application)->create(['reference_no' => 'OFR-2026-0001']);

    $response = $this->get("/api/v1/applications/{$application->id}/offers/{$offer->id}/letter");

    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    expect(substr((string) $response->getContent(), 0, 4))->toBe('%PDF');
});

it('denies the offer letter without application view scope', function () {
    actingAsStaffWith([]);
    $application = Application::factory()->create();
    $offer = Offer::factory()->for($application)->create();

    $this->get("/api/v1/applications/{$application->id}/offers/{$offer->id}/letter")->assertForbidden();
});

it('404s when the offer belongs to a different application', function () {
    actingAsStaffWith(['applications.view.global']);
    $application = Application::factory()->create();
    $otherOffer = Offer::factory()->create();

    $this->get("/api/v1/applications/{$application->id}/offers/{$otherOffer->id}/letter")
        ->assertNotFound();
});
