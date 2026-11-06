<?php

use App\Models\University;
use App\Services\Media\BrandedDownload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Intervention\Image\ImageManager;

uses(RefreshDatabase::class);

beforeEach(function () {
    $dir = sys_get_temp_dir().'/cas-media-'.uniqid();
    mkdir($dir.'/photos', 0777, true);
    file_put_contents($dir.'/photos/x.webp', (string) ImageManager::gd()->create(800, 500)->fill('#336699')->toWebp(80));
    config(['media.public_path' => $dir]);
});

function universityWithCover(string $credit): University
{
    return University::create([
        'name' => 'Test University', 'code' => 'TUB'.random_int(1, 99999), 'slug' => 'test-uni', 'status' => 'active',
        'cover_path' => '/photos/x.webp', 'cover_credit' => $credit, 'cover_source_url' => 'https://commons.wikimedia.org/wiki/File:X.jpg',
    ]);
}

it('offers a CAS-branded zip with attribution only for photos that allow redistribution', function () {
    universityWithCover('A. Author, CC BY-SA 4.0, via Wikimedia Commons');

    $this->getJson('/api/v1/public/universities/test-uni')->assertOk()->assertJsonPath('data.cover_downloadable', true);

    $response = $this->get('/api/v1/public/universities/test-uni/cover-download')->assertOk();
    $zip = new ZipArchive;
    $zip->open($response->baseResponse->getFile()->getPathname());
    expect($zip->getFromName('ATTRIBUTION.txt'))->toContain('A. Author, CC BY-SA 4.0')
        ->and($zip->locateName('test-uni-cover-cas.jpg'))->not->toBeFalse();
});

it('does not offer a branded copy of a photo whose licence forbids it', function () {
    universityWithCover('A. Author, CC BY-ND 2.0, via Wikimedia Commons');

    $this->getJson('/api/v1/public/universities/test-uni')->assertJsonPath('data.cover_downloadable', false);
    $this->get('/api/v1/public/universities/test-uni/cover-download')->assertNotFound();
    expect(app(BrandedDownload::class)->licence('X, CC BY-NC 4.0, via Wikimedia Commons'))->toBeNull();
});
