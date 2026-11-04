<?php

use App\Models\University;
use Database\Seeders\UniversityContactFixSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('corrects Shihezi website and fills missing addresses without overwriting', function () {
    $shihezi = University::factory()->create(['slug' => 'shihezi-university', 'website' => 'https://www.shzuni.com', 'address' => null]);
    $kept = University::factory()->create(['slug' => 'zhengzhou-university', 'address' => 'Kept Road 1']);

    $this->seed(UniversityContactFixSeeder::class);

    expect($shihezi->refresh()->website)->toBe('https://www.shzu.edu.cn')
        ->and($shihezi->address)->toContain('Shihezi')
        ->and($kept->refresh()->address)->toBe('Kept Road 1');
});
