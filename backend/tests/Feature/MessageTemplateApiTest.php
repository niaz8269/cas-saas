<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

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

it('test-sends an email template to a given recipient', function () {
    Mail::fake();
    actingAsStaffWith(['settings.manage.global']);

    $this->postJson('/api/v1/message-templates/welcome/test', ['channel' => 'email', 'to' => 'ops@cas.moe'])
        ->assertOk()
        ->assertJsonPath('data.channel', 'email')
        ->assertJsonPath('data.to', 'ops@cas.moe')
        ->assertJsonPath('data.status', 'sent')
        ->assertJsonPath('data.subject', 'Welcome to CAS Education');
});

it('defaults the email recipient to the acting admin', function () {
    Mail::fake();
    $admin = actingAsStaffWith(['settings.manage.global']);

    $this->postJson('/api/v1/message-templates/offer_received/test', ['channel' => 'email'])
        ->assertOk()
        ->assertJsonPath('data.to', $admin->email);
});

it('test-sends a non-email channel via the log driver without mail', function () {
    Mail::fake();
    actingAsStaffWith(['settings.manage.global']);

    $this->postJson('/api/v1/message-templates/welcome/test', ['channel' => 'whatsapp'])
        ->assertOk()
        ->assertJsonPath('data.channel', 'whatsapp')
        ->assertJsonPath('data.status', 'sent');

    Mail::assertNothingSent();
});

it('404s an unknown template and 422s a bad channel', function () {
    actingAsStaffWith(['settings.manage.global']);

    $this->postJson('/api/v1/message-templates/nope/test', ['channel' => 'email'])->assertNotFound();
    $this->postJson('/api/v1/message-templates/welcome/test', ['channel' => 'pigeon'])
        ->assertStatus(422)->assertJsonValidationErrors(['channel']);
});

it('denies test-send without settings.manage', function () {
    actingAsStaffWith([]);

    $this->postJson('/api/v1/message-templates/welcome/test', ['channel' => 'email'])->assertForbidden();
});
