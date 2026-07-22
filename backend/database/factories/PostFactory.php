<?php

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(5);

        return [
            'type' => 'news',
            'title' => rtrim($title, '.'),
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 999999),
            'excerpt' => fake()->sentence(12),
            'body' => '<p>'.fake()->paragraph().'</p>',
            'category' => null,
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => 'draft', 'published_at' => null]);
    }

    public function event(): static
    {
        return $this->state(fn () => [
            'type' => 'event',
            'event_date' => now()->addWeeks(2),
            'location' => fake()->city(),
            'register_url' => 'https://cas.moe/events/register',
        ]);
    }
}
