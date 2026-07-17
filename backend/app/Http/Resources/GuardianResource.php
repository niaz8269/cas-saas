<?php

namespace App\Http\Resources;

use App\Models\StudentGuardian;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StudentGuardian
 */
class GuardianResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'relation' => $this->relation,
            'phone' => $this->phone,
            'email' => $this->email,
        ];
    }
}
