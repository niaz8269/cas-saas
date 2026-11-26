<?php

use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => config(['app.url' => 'https://cas.moe']));

it('sends every subdomain to the same path on the main domain', function () {
    $this->get('https://dalian.cas.moe/site/universities/zju?x=1')->assertStatus(301)->assertRedirect('https://cas.moe/site/universities/zju?x=1');
    $this->get('https://anything.cas.moe/')->assertStatus(301)->assertRedirect('https://cas.moe/');
    $this->get('https://www.cas.moe/site/faq')->assertStatus(301)->assertRedirect('https://cas.moe/site/faq');
});

it('does not redirect the main domain or another host', function () {
    $this->get('https://cas.moe/health')->assertSuccessful();
    $this->get('http://localhost/health')->assertSuccessful();
});

it('moves old-site addresses to their new page, keeping a university by name', function () {
    University::factory()->create(['slug' => 'wuhan-university-of-technology', 'status' => 'active']);

    $this->get('/universities/wuhan-university-of-technology')->assertStatus(301)->assertRedirect('/site/universities/wuhan-university-of-technology');
    $this->get('/universities/not-a-university')->assertStatus(301)->assertRedirect('/site/universities');
    $this->get('/programs/bs-computer-science-wut')->assertStatus(301)->assertRedirect('/site/programs');
    $this->get('/study/computer-science-in-china')->assertStatus(301)->assertRedirect('/site/programs');
    $this->get('/services')->assertStatus(301)->assertRedirect('/site/services');
    $this->get('/auth/login.php')->assertStatus(301)->assertRedirect('/portal/login');
    $this->get('/auth/register.php')->assertStatus(301)->assertRedirect('/portal/register');
    $this->get('/wuhan-university-of-technology.html')->assertStatus(301)->assertRedirect('/site/universities/wuhan-university-of-technology');
    $this->get('/some-old-college.html')->assertStatus(301)->assertRedirect('/site/mbbs-in-china');
    $this->get('/about')->assertStatus(301)->assertRedirect('/site/about');
    $this->get('/contact')->assertStatus(301)->assertRedirect('/site/contact');
    $this->get('/refund-policy')->assertStatus(301)->assertRedirect('/site/terms');
    $this->get('/scholarships/jlmu-merit-scholarship')->assertStatus(301)->assertRedirect('/site/scholarships');
    $this->get('/services/chinese-language-foundation')->assertStatus(301)->assertRedirect('/site/services');
});

it('keeps the staff app and portals working and answers unknown addresses with a real 404', function () {
    $this->get('/portal/login')->assertSuccessful();
    $this->get('/universities/12')->assertSuccessful(); // a staff screen, not an old public address
    $this->get('/scholarships')->assertSuccessful();
    $this->get('/finance/bank-accounts')->assertSuccessful();
    $this->get('/totally-unknown-page')->assertNotFound()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    $this->get('/xxmu/index.php')->assertNotFound();
});
