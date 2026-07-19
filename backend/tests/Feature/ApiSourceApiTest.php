<?php

use App\Models\ApiKey;
use App\Models\ApiSource;
use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

const INTEGRATIONS_PERMS = ['settings.manage.global'];

it('denies managing sources without the settings permission', function () {
    actingAsStaffWith(['users.manage.global']); // some other permission

    $this->getJson('/api/v1/api-sources')
        ->assertStatus(403)
        ->assertJsonPath('code', 'FORBIDDEN');
});

it('requires authentication', function () {
    $this->getJson('/api/v1/api-sources')
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('lists sources with key counts for an integrations manager', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $source = ApiSource::factory()->create(['name' => 'XJMU Site']);
    $source->apiKeys()->create(['key_hash' => ApiKey::hashKey('cas_a'), 'rate_limit' => 60]);
    $source->apiKeys()->create(['key_hash' => ApiKey::hashKey('cas_b'), 'rate_limit' => 60, 'revoked_at' => now()]);

    $this->getJson('/api/v1/api-sources')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'type', 'is_active', 'active_keys_count', 'keys']], 'meta'])
        ->assertJsonPath('data.0.active_keys_count', 1);
});

it('creates a source bound to a university and default program', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $uni = University::factory()->create();
    $program = Program::factory()->for($uni)->create();

    $this->postJson('/api/v1/api-sources', [
        'name' => 'Xinjiang Medical Site',
        'type' => 'website',
        'website_url' => 'https://admissions.xjmu.example',
        'university_id' => $uni->id,
        'default_program_id' => $program->id,
    ])->assertCreated()
        ->assertJsonPath('data.university.id', $uni->id)
        ->assertJsonPath('data.default_program.id', $program->id);
});

it('rejects a default program from a different university', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $uni = University::factory()->create();
    $foreignProgram = Program::factory()->create();

    $this->postJson('/api/v1/api-sources', [
        'name' => 'Mismatch Site',
        'type' => 'website',
        'university_id' => $uni->id,
        'default_program_id' => $foreignProgram->id,
    ])->assertStatus(422)->assertJsonValidationErrors(['default_program_id']);
});

it('mints a key and returns the plain value exactly once', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $source = ApiSource::factory()->create();

    $response = $this->postJson("/api/v1/api-sources/{$source->id}/keys", ['rate_limit' => 120])
        ->assertCreated();

    $plain = $response->json('plain_key');
    expect($plain)->toStartWith('cas_')
        ->and($response->json('source.active_keys_count'))->toBe(1);

    // Stored only as a hash — never the plain value.
    $key = $source->apiKeys()->firstOrFail();
    expect($key->key_hash)->toBe(ApiKey::hashKey($plain))
        ->and($key->rate_limit)->toBe(120);
});

it('revokes a key without deleting it', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $source = ApiSource::factory()->create();
    $key = $source->apiKeys()->create(['key_hash' => ApiKey::hashKey('cas_x'), 'rate_limit' => 60]);

    $this->deleteJson("/api/v1/api-sources/{$source->id}/keys/{$key->id}")->assertNoContent();

    expect($key->refresh()->revoked_at)->not->toBeNull();
});

it('does not revoke a key belonging to another source', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $source = ApiSource::factory()->create();
    $other = ApiSource::factory()->create();
    $key = $other->apiKeys()->create(['key_hash' => ApiKey::hashKey('cas_y'), 'rate_limit' => 60]);

    $this->deleteJson("/api/v1/api-sources/{$source->id}/keys/{$key->id}")->assertNotFound();
    expect($key->refresh()->revoked_at)->toBeNull();
});

it('lets a super admin manage sources without explicit permissions', function () {
    $user = actingAsStaffWith([]);
    Role::findOrCreate('Super Admin', 'staff');
    $user->assignRole('Super Admin');

    $this->postJson('/api/v1/api-sources', ['name' => 'SA Source', 'type' => 'manual'])
        ->assertCreated();
});

it('soft-deletes a source', function () {
    actingAsStaffWith(INTEGRATIONS_PERMS);
    $source = ApiSource::factory()->create();

    $this->deleteJson("/api/v1/api-sources/{$source->id}")->assertNoContent();
    $this->assertSoftDeleted('api_sources', ['id' => $source->id]);
});
