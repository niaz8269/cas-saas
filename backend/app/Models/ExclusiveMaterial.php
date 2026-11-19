<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A downloadable file for agencies: brochure, banner, social post, price list, video link sheet. */
class ExclusiveMaterial extends Model
{
    use Auditable;

    public const CATEGORIES = ['brochure', 'banner', 'social', 'video', 'price_list', 'contract', 'other'];

    /** 25 MB: brochures and banners; larger videos should be shared as a link in the description. */
    public const MAX_KB = 25600;

    protected $fillable = [
        'exclusive_offer_id', 'title', 'description', 'category', 'disk', 'path',
        'original_name', 'mime', 'size', 'download_count', 'uploaded_by',
    ];

    public function offer(): BelongsTo
    {
        return $this->belongsTo(ExclusiveOffer::class, 'exclusive_offer_id');
    }
}
