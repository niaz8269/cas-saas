<?php

return [
    // Folder that holds the site's own static files (photos/, logos/, images/); the web root on the server.
    'public_path' => env('PUBLIC_ASSETS_PATH', base_path('../frontend/public')),

    // Where admin-uploaded catalog/cover images go. Unset = S3-compatible storage;
    // "public_path" = an uploads/ folder inside the web root above (hosts with no
    // bucket). Uploaded images are public site content, unlike private documents.
    'images_store' => env('IMAGES_STORE'),
];
