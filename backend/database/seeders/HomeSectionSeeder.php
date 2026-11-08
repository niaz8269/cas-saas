<?php

namespace Database\Seeders;

use App\Models\HomeSection;
use Illuminate\Database\Seeder;

/**
 * Creates the built-in home page sections in their standard order. Idempotent, and it never touches a
 * section that already exists, so staff changes to order, visibility and text are kept.
 */
class HomeSectionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (HomeSection::BUILT_IN as $key => $order) {
            HomeSection::firstOrCreate(['key' => $key], ['type' => $key, 'sort_order' => $order, 'is_visible' => true]);
        }
    }
}
