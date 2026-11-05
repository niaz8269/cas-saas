<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets anonymous catalog reads be cached briefly and keeps signed-in reads private', function () {
    $anonymous = $this->getJson('/api/v1/public/universities')->assertOk();
    expect($anonymous->headers->get('Cache-Control'))->toContain('public')->toContain('max-age=60')
        ->and($anonymous->headers->get('Vary'))->toContain('Authorization');

    $signedIn = $this->withHeader('Authorization', 'Bearer not-a-real-token')->getJson('/api/v1/public/universities');
    expect((string) $signedIn->headers->get('Cache-Control'))->not->toContain('public');
});
