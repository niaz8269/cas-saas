<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** What a city is like: history, places to visit, climate, economy, culture. Built from the city's Wikipedia article. */
class CityProfile extends Model
{
    protected $fillable = ['slug', 'city', 'province', 'summary', 'sections', 'source_url'];

    protected function casts(): array
    {
        return ['sections' => 'array'];
    }
}
