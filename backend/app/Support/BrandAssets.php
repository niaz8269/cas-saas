<?php

namespace App\Support;

/**
 * Brand assets for server-rendered documents (PDFs). Images are inlined as
 * base64 data URIs because dompdf runs with remote fetching disabled.
 */
class BrandAssets
{
    /** Base64 data URI for the CAS logo, or null when the asset is missing. */
    public static function logoDataUri(): ?string
    {
        $path = resource_path('images/cas-logo.png');

        return is_file($path)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($path))
            : null;
    }
}
