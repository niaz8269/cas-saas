<?php

use App\Services\Media\ImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

use function Pest\Laravel\get;

uses(RefreshDatabase::class);

it('sends browser protection headers on pages and the API', function () {
    foreach (['/', '/api/v1/public/home'] as $url) {
        get($url)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    expect(get('/')->headers->get('Content-Security-Policy'))->toContain("frame-ancestors 'self'")->toContain("object-src 'self'");
});

it('adds HSTS only on HTTPS and does not name the environment on the health check', function () {
    get('/')->assertHeaderMissing('Strict-Transport-Security');
    $this->get('https://localhost/')->assertHeader('Strict-Transport-Security');
    get('/health')->assertOk()->assertJsonMissingPath('env');
});

it('puts a script-blocking .htaccess in the uploads folder', function () {
    $public = sys_get_temp_dir().'/cas-public-'.uniqid();
    config(['media.images_store' => 'public_path', 'media.public_path' => $public]);

    app(ImageService::class)->storeWebp(UploadedFile::fake()->image('a.png', 20, 20), 'catalog');

    expect(File::get($public.'/uploads/.htaccess'))->toContain('Require all denied')->toContain('php');
    File::deleteDirectory($public);
});

it('answers an unauthenticated API request with 401 JSON even without an Accept header', function () {
    $this->call('GET', '/api/v1/users')->assertStatus(401)->assertJsonPath('code', 'UNAUTHENTICATED');
});
