<?php

use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Intervention\Image\ImageManager;

uses(RefreshDatabase::class);

beforeEach(function () {
    $dir = sys_get_temp_dir().'/cas-wm-'.uniqid();
    mkdir($dir.'/photos', 0777, true);
    mkdir($dir.'/images', 0777, true);
    foreach (['photos/a.webp', 'photos/b.webp', 'images/hero-x.webp', 'images/logo.webp'] as $f) {
        file_put_contents("{$dir}/{$f}", (string) ImageManager::gd()->create(600, 400)->fill('#446688')->toWebp(80));
    }
    config(['media.public_path' => $dir]);
});

it('serves a CAS-emblem copy of a site photo', function () {
    University::create(['name' => 'A', 'code' => 'WA1', 'status' => 'active', 'cover_path' => '/photos/a.webp', 'cover_credit' => 'X, CC BY 4.0, via Wikimedia Commons']);

    $response = $this->get('/wm/photos/a.webp')->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('image/jpeg')
        ->and(is_file(config('media.public_path').'/wm/photos/a.jpg'))->toBeTrue();
    $this->get('/wm/images/hero-x.webp')->assertOk();
});

it('hands back the original instead of altering a photo whose licence does not allow it', function () {
    University::create(['name' => 'B', 'code' => 'WB1', 'status' => 'active', 'cover_path' => '/photos/b.webp', 'cover_credit' => 'X, CC BY-ND 2.0, via Wikimedia Commons']);

    $this->get('/wm/photos/b.webp')->assertRedirect('/photos/b.webp');
    $this->get('/wm/images/logo.webp')->assertRedirect('/images/logo.webp');
    expect(is_file(config('media.public_path').'/wm/photos/b.jpg'))->toBeFalse();
});
