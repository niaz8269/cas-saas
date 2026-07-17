<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists message templates for settings managers', function () {
    actingAsStaffWith(['settings.manage.global']);

    $this->getJson('/api/v1/message-templates')
        ->assertOk()
        ->assertJsonStructure(['data' => [['key', 'subject', 'preview']]])
        ->assertJsonPath('data.0.key', fn ($v) => is_string($v));
});

it('denies templates without settings.manage', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/message-templates')->assertForbidden();
});
