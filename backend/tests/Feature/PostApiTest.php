<?php

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ── Admin ─────────────────────────────────────────────────────────────────────

it('creates a post, sanitizes the body, and stamps publish + author', function () {
    $user = actingAsStaffWith(['content.view.global', 'content.manage.global']);

    $this->postJson('/api/v1/posts', [
        'type' => 'blog',
        'title' => 'Studying MBBS in China',
        'body' => '<p>Great option.</p><script>alert(1)</script><a href="javascript:evil()">x</a>',
        'status' => 'published',
    ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'blog')
        ->assertJsonPath('data.status', 'published');

    $post = Post::firstOrFail();
    expect($post->slug)->toBe('studying-mbbs-in-china')
        ->and($post->author_id)->toBe($user->id)
        ->and($post->published_at)->not->toBeNull()
        ->and($post->body)->toContain('Great option')
        ->and($post->body)->not->toContain('<script')
        ->and($post->body)->not->toContain('javascript:');
});

it('requires an event date for events', function () {
    actingAsStaffWith(['content.manage.global']);

    $this->postJson('/api/v1/posts', ['type' => 'event', 'title' => 'Open day'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('event_date');
});

it('lists posts filtered by type and status for the admin', function () {
    actingAsStaffWith(['content.view.global']);
    Post::factory()->create(['type' => 'news', 'title' => 'Newsy']);
    Post::factory()->draft()->create(['type' => 'blog']);

    $this->getJson('/api/v1/posts?filter[type]=news')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Newsy');
});

it('updates and soft-deletes a post', function () {
    actingAsStaffWith(['content.manage.global']);
    $post = Post::factory()->create(['title' => 'Old']);

    $this->patchJson("/api/v1/posts/{$post->id}", ['title' => 'New title'])
        ->assertOk()->assertJsonPath('data.title', 'New title');

    $this->deleteJson("/api/v1/posts/{$post->id}")->assertNoContent();
    expect($post->fresh()->trashed())->toBeTrue();
});

it('denies writing without the manage permission', function () {
    actingAsStaffWith(['content.view.global']);

    $this->postJson('/api/v1/posts', ['type' => 'news', 'title' => 'X'])->assertForbidden();
});

// ── Public ────────────────────────────────────────────────────────────────────

it('lists only published posts on the public endpoint, filterable by type', function () {
    Post::factory()->create(['type' => 'news', 'title' => 'Published news']);
    Post::factory()->draft()->create(['type' => 'news', 'title' => 'Draft news']);
    Post::factory()->create(['type' => 'blog', 'title' => 'A blog']);

    $res = $this->getJson('/api/v1/public/posts')->assertOk();
    expect(collect($res->json('data'))->pluck('title'))
        ->toContain('Published news', 'A blog')
        ->not->toContain('Draft news');

    // The list omits the body.
    expect($res->json('data.0'))->not->toHaveKey('body');

    $this->getJson('/api/v1/public/posts?type=blog')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'A blog');
});

it('shows a published post by slug with its body, but hides drafts', function () {
    $post = Post::factory()->create(['slug' => 'hello-world', 'body' => '<p>Body here</p>']);
    $draft = Post::factory()->draft()->create(['slug' => 'secret-draft']);

    $this->getJson('/api/v1/public/posts/hello-world')
        ->assertOk()
        ->assertJsonPath('data.slug', 'hello-world')
        ->assertJsonPath('data.body', '<p>Body here</p>');

    $this->getJson("/api/v1/public/posts/{$draft->slug}")->assertNotFound();
});
