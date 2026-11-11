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
    'site_name' => 'CAS-Consultancy for Abroad Study',
    // Other names people use; sent to Google as WebSite alternateName.
    'alternate_names' => ['CAS', 'CAS Education', 'CAS Consultancy for Abroad Study', 'Consultancy for Abroad Study'],

    'short_name' => 'CAS',

    // Public origin used in canonicals, sitemaps and social tags (no trailing slash).
    'site_url' => rtrim(env('SITE_URL', env('APP_URL', 'http://localhost:8080')), '/'),

    // The built SPA shell. In production point this at frontend/dist/index.html.
    'index_path' => env('SEO_INDEX_PATH', base_path('../frontend/index.html')),

    // IndexNow key (Bing, Yandex, Seznam, Naver): the key file is served at /{key}.txt.
    'indexnow_key' => env('INDEXNOW_KEY'),

    // Seeders and other console runs never ping search engines; tests switch this on.
    'ping_from_console' => false,

    'default_image' => '/og-image.png',

    // Static public pages: path => [title, description, priority, changefreq]
    'pages' => [
        '' => ['Study in China', 'Find MBBS, engineering and business programs at {universities} Chinese universities and colleges. See application windows, tuition and scholarships, and apply with CAS.', 1.0, 'daily'],
        'site/universities' => ['Universities in China for International Students', 'Browse {universities} Chinese universities and colleges with programs, tuition, application windows and scholarships for international students. Filter by city or MoE-approved MBBS.', 0.9, 'daily'],
        'site/programs' => ['Find Programs to Study in China', 'Search {programs} programs in China by degree, language and budget: bachelor, master, PhD, English-taught MBBS, engineering and business.', 0.9, 'daily'],
        'site/scholarships' => ['Scholarships to Study in China', 'Chinese Government (CSC), provincial and university scholarships for international students, with eligibility and application windows.', 0.9, 'weekly'],
        'site/mbbs-in-china' => ['MBBS in China: Approved Universities, Fees & Dates', 'The 43 universities approved by China\'s Ministry of Education to enrol English-taught MBBS students in 2026–27, with tuition, application windows and how to apply.', 0.95, 'weekly'],
        'site/csc-scholarship' => ['CSC Scholarship (Chinese Government Scholarship) Guide', 'How the Chinese Government Scholarship (CSC) works: who can apply, what it covers, deadlines by route, and which Chinese universities list CSC programs.', 0.9, 'weekly'],
        'site/cities' => ['Study in China by City: Beijing, Shanghai & More', 'Explore Chinese cities for international students: universities in each city, climate, transport and student life.', 0.8, 'weekly'],
        'site/why-china' => ['Why Study in China', 'Why international students choose China: world-ranked universities, English-taught degrees, affordable tuition and scholarships.', 0.7, 'monthly'],
        'site/services' => ['Our Services for Students Going to China', 'Admission service, visa assistance, scholarship help, airport pickup and on-campus support from CAS, an authorized agent since 2012.', 0.7, 'monthly'],
        'site/about' => ['About CAS: Consultancy for Abroad Study', 'CAS has guided international students into Chinese universities since 2012 as an authorized agent. Learn how we work.', 0.6, 'monthly'],
        'site/news' => ['News & Updates on Studying in China', 'Admission deadlines, scholarship openings and guides for international students applying to Chinese universities.', 0.7, 'daily'],
        'site/contact' => ['Contact CAS & Free Consultation', 'Request a free consultation with a CAS counselor about studying in China: universities, scholarships, visas and fees.', 0.6, 'monthly'],
        'site/pricing' => ['CAS Pricing: Free Plan & Clear Service Fees', 'Free consultation and study plan; paid services are quoted clearly and up front. No hidden fees.', 0.5, 'monthly'],
        'site/partner' => ['Partner with CAS: Agency & Recruitment Cooperation', 'Refer students to {universities} Chinese universities and colleges through an authorized agent, with a partner portal and clear commissions.', 0.5, 'monthly'],
        'site/faq' => ['FAQ: Studying in China with CAS', 'Answers about choosing a university, scholarships, applying, student visas, arrival support and fees.', 0.6, 'monthly'],
        'site/study-plan' => ['Get a Free Study Plan for China', 'Tell us your goal and budget and a CAS advisor sends a personalised shortlist of universities, programs and scholarships.', 0.5, 'monthly'],
        'site/share-your-experience' => ['Share Your Experience with CAS', 'Students and partners: tell others what it was like to work with CAS.', 0.3, 'yearly'],
        'site/terms' => ['Terms & Conditions', 'The terms for using the CAS website and services.', 0.1, 'yearly'],
        'site/privacy' => ['Privacy Policy', 'How CAS collects, uses, shares and protects personal information.', 0.1, 'yearly'],
        'site/photo-credits' => ['Photo Credits', 'Authors and licences of the photos used on the CAS website.', 0.1, 'yearly'],
    ],
];
