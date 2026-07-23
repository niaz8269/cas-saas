<?php

use App\Models\Campaign;
use App\Models\MarketingSource;
use App\Models\WebsiteSource;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * Campaigns + lead-source management — the Marketing module. Read gated on
 * marketing.view, writes on marketing.manage.
 */

const MKT_MANAGE = ['marketing.view.global', 'marketing.manage.global'];

it('lists campaigns for a marketing viewer', function () {
    actingAsStaffWith(['marketing.view.global']);
    Campaign::factory()->count(2)->create();

    $this->getJson('/api/v1/campaigns')->assertOk()->assertJsonCount(2, 'data');
});

it('creates a campaign linked to a source', function () {
    actingAsStaffWith(MKT_MANAGE);
    $source = MarketingSource::factory()->create();

    $this->postJson('/api/v1/campaigns', [
        'name' => 'Autumn intake push',
        'marketing_source_id' => $source->id,
        'utm_source' => 'facebook', 'utm_medium' => 'cpc', 'utm_campaign' => 'autumn26',
        'start_date' => '2026-08-01', 'end_date' => '2026-09-30',
    ])->assertCreated()->assertJsonPath('data.name', 'Autumn intake push');

    $this->assertDatabaseHas('campaigns', ['name' => 'Autumn intake push', 'marketing_source_id' => $source->id]);
});

it('rejects a campaign whose end date precedes its start date', function () {
    actingAsStaffWith(MKT_MANAGE);

    $this->postJson('/api/v1/campaigns', ['name' => 'Bad dates', 'start_date' => '2026-09-01', 'end_date' => '2026-08-01'])
        ->assertStatus(422)->assertJsonValidationErrors(['end_date']);
});

it('updates then soft-deletes a campaign', function () {
    actingAsStaffWith(MKT_MANAGE);
    $campaign = Campaign::factory()->create();

    $this->patchJson("/api/v1/campaigns/{$campaign->id}", ['name' => 'Renamed'])
        ->assertOk()->assertJsonPath('data.name', 'Renamed');

    $this->deleteJson("/api/v1/campaigns/{$campaign->id}")->assertNoContent();
    $this->assertSoftDeleted('campaigns', ['id' => $campaign->id]);
});

it('denies campaign writes to a view-only marketer', function () {
    actingAsStaffWith(['marketing.view.global']);

    $this->postJson('/api/v1/campaigns', ['name' => 'X'])->assertStatus(403);
});

it('denies the module entirely without marketing view', function () {
    actingAsStaffWith(['leads.view.global']);

    $this->getJson('/api/v1/campaigns')->assertStatus(403);
    $this->getJson('/api/v1/marketing-sources')->assertStatus(403);
});

it('manages marketing sources with a campaign count', function () {
    actingAsStaffWith(MKT_MANAGE);

    $id = $this->postJson('/api/v1/marketing-sources', ['name' => 'Facebook Ads', 'channel' => 'social', 'is_active' => true])
        ->assertCreated()->json('data.id');

    Campaign::factory()->create(['marketing_source_id' => $id]);

    $this->getJson('/api/v1/marketing-sources')->assertOk()->assertJsonPath('data.0.campaigns_count', 1);

    $this->patchJson("/api/v1/marketing-sources/{$id}", ['is_active' => false])
        ->assertOk()->assertJsonPath('data.is_active', false);

    $this->deleteJson("/api/v1/marketing-sources/{$id}")->assertNoContent();
    $this->assertSoftDeleted('marketing_sources', ['id' => $id]);
});

it('registers a website source so ingested leads can be attributed', function () {
    actingAsStaffWith(MKT_MANAGE);

    $this->postJson('/api/v1/website-sources', ['domain' => 'study-abroad.pk', 'university_focus' => 'Jilin Medical', 'is_active' => true])
        ->assertCreated()->assertJsonPath('data.domain', 'study-abroad.pk');

    $this->assertDatabaseHas('website_sources', ['domain' => 'study-abroad.pk']);
});

it('rejects a duplicate website domain', function () {
    actingAsStaffWith(MKT_MANAGE);
    WebsiteSource::factory()->create(['domain' => 'taken.example']);

    $this->postJson('/api/v1/website-sources', ['domain' => 'taken.example'])
        ->assertStatus(422)->assertJsonValidationErrors(['domain']);
});

it('updates and deletes a website source', function () {
    actingAsStaffWith(MKT_MANAGE);
    $source = WebsiteSource::factory()->create();

    $this->patchJson("/api/v1/website-sources/{$source->id}", ['is_active' => false])
        ->assertOk()->assertJsonPath('data.is_active', false);

    $this->deleteJson("/api/v1/website-sources/{$source->id}")->assertNoContent();
    $this->assertDatabaseMissing('website_sources', ['id' => $source->id]);
});

it('denies website-source writes to a view-only marketer', function () {
    actingAsStaffWith(['marketing.view.global']);

    $this->postJson('/api/v1/website-sources', ['domain' => 'x.example'])->assertStatus(403);
});
