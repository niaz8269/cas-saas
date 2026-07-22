<?php

use App\Models\University;
use App\Services\Media\ImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('denies image upload without a catalog-manage grant', function () {
    actingAsStaffWith(['universities.view.global']); // view only
    Storage::fake('s3');

    $this->postJson('/api/v1/uploads/images', [
        'image' => UploadedFile::fake()->image('logo.png', 200, 200),
    ])->assertForbidden();
});

it('converts an uploaded image to webp and stores it', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    Storage::fake('s3');

    $response = $this->postJson('/api/v1/uploads/images', [
        'image' => UploadedFile::fake()->image('logo.png', 400, 300),
    ])->assertOk()->json();

    expect($response['path'])->toEndWith('.webp')
        ->and($response['path'])->toStartWith('catalog/')
        ->and(Storage::disk('s3')->exists($response['path']))->toBeTrue();

    // Stored bytes are a real WebP (RIFF....WEBP header).
    $bytes = Storage::disk('s3')->get($response['path']);
    expect(substr($bytes, 0, 4))->toBe('RIFF')
        ->and(substr($bytes, 8, 4))->toBe('WEBP');
});

it('lets a content manager upload a cover image', function () {
    actingAsStaffWith(['content.manage.global']);
    Storage::fake('s3');

    $this->postJson('/api/v1/uploads/images', [
        'image' => UploadedFile::fake()->image('cover.png', 400, 300),
    ])
        ->assertOk()
        ->assertJsonPath('path', fn ($path) => str_ends_with((string) $path, '.webp'));
});

it('rejects a non-image or oversized upload', function () {
    actingAsStaffWith(['universities.manage.global']);
    Storage::fake('s3');

    $this->postJson('/api/v1/uploads/images', [
        'image' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
    ])->assertStatus(422);
});

it('resolves stored keys and passes external URLs through', function () {
    $images = app(ImageService::class);

    expect($images->url(null))->toBeNull()
        ->and($images->url('https://cdn.example/logo.webp'))->toBe('https://cdn.example/logo.webp');
});

it('exposes logo_url / cover_url / professor photo_url on the resource', function () {
    actingAsStaffWith(['universities.view.global']);
    $uni = University::factory()->create([
        'logo_path' => 'https://cdn/logo.webp',
        'cover_path' => 'https://cdn/cover.webp',
        'representative_professor' => ['name' => 'Prof. Li', 'title' => 'Dean', 'photo' => 'https://cdn/li.webp'],
    ]);

    $this->getJson("/api/v1/universities/{$uni->id}")
        ->assertOk()
        ->assertJsonPath('data.logo_url', 'https://cdn/logo.webp')
        ->assertJsonPath('data.cover_url', 'https://cdn/cover.webp')
        ->assertJsonPath('data.representative_professor.photo_url', 'https://cdn/li.webp');
});
