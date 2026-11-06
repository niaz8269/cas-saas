<?php

use App\Models\University;
use Database\Seeders\CountrySeeder;
use Database\Seeders\MoeInstitutionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists every Ministry of Education undergraduate university once, with its province', function () {
    $this->seed(CountrySeeder::class);
    University::create(['name' => 'Nanjing Xiaozhuang University', 'name_zh' => '南京晓庄学院', 'code' => 'NXU', 'status' => 'active']);

    $this->seed(MoeInstitutionsSeeder::class);
    $this->seed(MoeInstitutionsSeeder::class);

    $rows = json_decode(file_get_contents(database_path('data/moe_institutions.json')), true)['institutions'];

    expect(University::count())->toBe(count($rows))
        ->and(University::where('name_zh', '南京晓庄学院')->count())->toBe(1)
        ->and(University::where('province', 'Tibet')->count())->toBeGreaterThan(0)
        ->and(University::whereNull('province')->where('code', '!=', 'NXU')->count())->toBe(0);
});
