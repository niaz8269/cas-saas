<?php

/*
|--------------------------------------------------------------------------
| Public website SEO
|--------------------------------------------------------------------------
| Titles are kept under ~60 characters and descriptions under ~155 so search
| results do not truncate them. `{site}` is appended as " | CAS".
*/
return [
    // The name Google should show for the whole site. Keep it identical in the page title, og:site_name,
    // the WebSite and Organization data, and the visible logo/footer text.
    'site_name' => 'CAS',
    // Other names people use; sent to Google as WebSite alternateName.
    'alternate_names' => ['CAS - Study in China', 'CAS Study in China', 'CAS-Consultancy for Abroad Study', 'CAS Consultancy for Abroad Study', 'Consultancy for Abroad Study'],

    'short_name' => 'CAS',

    // Words that always link to a partner's own CAS microsite wherever they appear in running text.
    'brand_links' => [
        'Dalian Medical University' => 'https://dmu.cas.moe',
        'Xinjiang Medical University' => 'https://xjmu.online',
        'XJMU' => 'https://xjmu.online',
    ],

    // Posts whose address changed: old slug => new slug (the old address answers with a permanent redirect).
    'renamed_posts' => [
        'moe-approves-43-universities-english-mbbs-2026-27' => 'moe-approves-43-universities-english-mbbs-2027',
    ],

    // Public origin used in canonicals, sitemaps and social tags (no trailing slash).
    'site_url' => rtrim(env('SITE_URL', env('APP_URL', 'http://localhost:8080')), '/'),

    // The built SPA shell. In production point this at frontend/dist/index.html.
    'index_path' => env('SEO_INDEX_PATH', base_path('../frontend/index.html')),

    // IndexNow key (Bing, Yandex, Seznam, Naver): the key file is served at /{key}.txt.
    'indexnow_key' => env('INDEXNOW_KEY'),

    // Seeders and other console runs never ping search engines; tests switch this on.
    'ping_from_console' => false,

    'default_image' => '/og-image.png',

    // A university page with at least this many Ministry-registered majors is indexed even before CAS has confirmed programs or dates.
    'min_registered_majors' => (int) env('SEO_MIN_REGISTERED_MAJORS', 12),

    // Public catalog API calls allowed per minute from one address.
    'public_api_per_minute' => (int) env('PUBLIC_API_PER_MINUTE', 300),

    // First path segment of the staff app and the portals (single-page app routes). These get the app shell,
    // never indexed. Any other address that is not a public page is answered with a real 404.
    'app_prefixes' => [
        'admin', 'login', 'portal', 'dashboard', 'tasks', 'leads', 'students', 'applications', 'universities', 'scholarships',
        'finance', 'commissions', 'agent-payables', 'visa', 'reports', 'users', 'partner-requests', 'exclusives', 'content',
        'testimonials', 'home-page', 'campaigns', 'integrations', 'error-log', 'settings',
    ],

    // How long a prerendered public page is reused (0 disables). Keeps crawler bursts off the database.
    'page_cache_seconds' => env('SEO_PAGE_CACHE_SECONDS', env('APP_ENV') === 'testing' ? 0 : 900),

    // Static public pages: path => [title, description, priority, changefreq]
    'pages' => [
        '' => ['Study in China: Apply to Chinese Universities Online', 'Study in China with CAS, an authorized agency since 2012. Browse {universities} Chinese universities, programs and scholarships, and apply online.', 1.0, 'daily'],
        'site/universities' => ['Universities in China for International Students', 'Browse {universities} Chinese universities and colleges with programs, tuition, application windows and scholarships for international students. Filter by city or MoE-approved MBBS.', 0.9, 'daily'],
        'site/programs' => ['Programs in China: Bachelor, Master, PhD & MBBS', 'Search {programs} programs at Chinese universities by degree, language and budget: bachelor, master, PhD, MBBS, engineering and business. Compare tuition and apply online.', 0.9, 'daily'],
        'site/scholarships' => ['Scholarships in China: CSC, Provincial & University', 'Find CSC, provincial and university scholarships for international students: what each covers, who can apply and when applications open.', 0.9, 'weekly'],
        'site/mbbs-in-china' => ['MBBS in China 2027: Approved Universities & Fees', 'MBBS in China 2027: the 43 universities approved by the Ministry of Education for English-taught MBBS, with tuition, application windows and how to apply.', 0.95, 'weekly'],
        'site/csc-scholarship' => ['CSC Scholarship (Chinese Government Scholarship) Guide', 'How the Chinese Government Scholarship (CSC) works: who can apply, what it covers, deadlines by route, and which Chinese universities list CSC programs.', 0.9, 'weekly'],
        'site/cities' => ['Study in China by City: Beijing, Shanghai & More', 'Explore Chinese cities for international students: universities in each city, climate, transport and student life.', 0.8, 'weekly'],
        'site/why-china' => ['Why Study in China: Costs, Quality & Scholarships', 'Why international students choose China: world-ranked universities, English-taught degrees, affordable tuition and scholarships.', 0.7, 'monthly'],
        'site/services' => ['CAS Services: Admission, Visa & Scholarship Help', 'Admission service, visa assistance, scholarship help, airport pickup and on-campus support from CAS, an authorized agency since 2012.', 0.7, 'monthly'],
        'site/about' => ['About CAS: Consultancy for Abroad Study', 'CAS has guided international students into Chinese universities since 2012 as an authorized agency. Learn how we work.', 0.6, 'monthly'],
        'site/news' => ['Study in China News: Deadlines, Scholarships, Guides', 'Admission deadlines, scholarship openings and guides for international students applying to Chinese universities.', 0.7, 'daily'],
        'site/contact' => ['Contact CAS & Free Consultation', 'Request a free consultation with a CAS counselor about studying in China: universities, scholarships, visas and fees.', 0.6, 'monthly'],
        'site/pricing' => ['CAS Pricing: Free Plan & Clear Service Fees', 'Free consultation and study plan; paid services are quoted clearly and up front. No hidden fees.', 0.5, 'monthly'],
        'site/partner' => ['Partner With Us: Agency & Recruitment Cooperation', 'Refer students to {universities} Chinese universities and colleges through an authorized agency, with a partner portal and clear commissions.', 0.5, 'monthly'],
        'site/faq' => ['Study in China FAQ: Fees, Visa, Scholarships & Apply', 'Answers to common questions about choosing a Chinese university and program, scholarships, applying with CAS, student visas, arrival support and fees.', 0.6, 'monthly'],
        'site/study-plan' => ['Get a Free Study Plan for China', 'Tell us your goal and budget and a CAS advisor sends a personalised shortlist of universities, programs and scholarships.', 0.5, 'monthly'],
        'site/share-your-experience' => ['Share Your Experience with CAS', 'Students and partners: tell others what it was like to work with CAS.', 0.3, 'yearly'],
        'site/terms' => ['Terms & Conditions', 'The terms for using the CAS website and services.', 0.1, 'yearly'],
        'site/privacy' => ['Privacy Policy', 'How CAS collects, uses, shares and protects personal information.', 0.1, 'yearly'],
        'site/photo-credits' => ['Photo Credits', 'Authors and licences of the photos used on the CAS website.', 0.1, 'yearly'],
    ],
];
