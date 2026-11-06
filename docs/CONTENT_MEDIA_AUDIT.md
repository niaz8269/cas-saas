# Content and media audit (internal)

Policy from the owner (2026-11-06): keep the site's information and media, rewrite explanatory
text in CAS's own voice, present CAS as the publisher, never present third-party material as
CAS-owned, show images clean while browsing, and put CAS branding only on website-controlled
downloads of images CAS may redistribute.

Regenerate the two CSVs any time with `php artisan cas:audit-content` (they are written to
`backend/storage/app/audits`; copies of the 2026-11-06 run are in `docs/audit/`).

## Media (docs/audit/media-audit.csv)

| Kind | Status | Count | Notes |
|---|---|---|---|
| City photos | attribution | 244 | Wikimedia Commons, CC BY / CC BY-SA. Credit kept in the database and on the Photo credits page. |
| City photos | usable | 41 | CC0 / public domain. |
| Campus photos | attribution | 222 | As above. |
| Campus photos | usable | 18 | CC0 / public domain. |
| Campus photos | confirmed | 2 | Licence could not be confirmed from the source (`/photos/a0adae278cb187.webp`, `/photos/2a4fe872e9c90a.webp`). Owner confirmed on 2026-11-07 that the use is cleared. |
| University logos | confirmed | all | Each university's own mark, shown only to identify it. Owner confirmed on 2026-11-07 that permission is in place; no watermark, no download route. |
| University emblems | confirmed | all | Cropped from the logos; same handling and the same confirmation. |
| Home hero (Beijing skyline with fireworks, supplied by the owner 2026-11-06) and default header photo | confirmed | 2 | Owner confirmed on 2026-11-07 that the use is cleared. Photographer and licence are still not recorded here. The previous hero is kept in `frontend/src/assets/archive/`. |
| Page header photos supplied by the owner on 2026-11-06: Forbidden City roof (default), Chengdu skyline (universities), hands in sand (scholarships), Beijing at night (cities) | confirmed | 4 | Owner confirmed on 2026-11-07 that the use is cleared. Photographer and licence are still not recorded here. |
| Tianjin header photo (programs, pricing, MBBS) | attribution | 1 | Identical to the Wikimedia Commons photo already credited (KangTyngrwey, CC BY-SA 4.0); the credit is kept. |
| CAS artwork, brand files, WeChat QR | own | - | Created by CAS. |

How images are shown now:
- Pages show every photo clean: no mark is drawn over it.
- Credits stay on the Photo credits page and in the data.
- `GET /api/v1/public/universities/{slug}/cover-download` returns a zip with a CAS-emblem copy
  and an `ATTRIBUTION.txt`, only for photos whose licence allows it (CC BY, CC BY-SA, CC0,
  public domain; never NC or ND). Originals are never modified.
- Logos and emblems have no download route.

## Text (docs/audit/content-audit.csv)

| Content | Origin | Category | Action |
|---|---|---|---|
| University overviews (304) | English Wikipedia text of the university and its city, CC BY-SA 4.0 | third-party text | Rewrite in CAS voice; keep attribution until replaced |
| University introductions | Wikipedia lead where one existed, else CAS-written factual lines | mixed | Rewrite the Wikipedia-derived ones |
| Founding year, type, student numbers | Wikipedia / Wikidata facts | official third-party facts | Keep |
| Names, cities, Ministry school codes | Ministry of Education national list | official third-party facts | Keep |
| Registered majors (67,045) | Ministry of Education filing results; English names by CAS | official third-party facts | Keep |
| Programs, fees, dates, scholarships | Each university's own pages, restated by CAS | rewritten CAS content | Keep |
| News, blog, site pages | Written by CAS | original CAS | Keep |

Status (2026-11-07): the 304 Wikipedia-derived overviews and the introductions have been rewritten
in CAS's voice. The owner has confirmed that the owner-supplied photos, the 2 photos with an
unconfirmed source licence, and the university logos and emblems may be used. This is the owner's
statement; the underlying licence or permission documents are not stored in this repository, so
keep them where you can produce them if a rights holder ever asks.

Open items: none on media. If a rights holder objects, remove the item and re-run
`php artisan cas:audit-content`.
