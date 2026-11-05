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
| Campus photos | permission | 2 | Licence could not be confirmed (`/photos/a0adae278cb187.webp`, `/photos/2a4fe872e9c90a.webp`). Kept, flagged: confirm the licence or replace. |
| University logos | permission | all | Each university's own mark, shown only to identify it. Request permission per university; no watermark, no download route. |
| University emblems | permission | all | Cropped from the logos; same handling. |
| Home hero (Beijing skyline with fireworks, supplied by the owner 2026-11-06) and default header photo | verify | 2 | Photographer and licence not recorded. Owner to confirm. The previous hero is kept in `frontend/src/assets/archive/`. |
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

Open items: rewrite the 304 Wikipedia-derived overviews; confirm the hero image sources; request
logo permissions; resolve the 2 photos with an unconfirmed licence.
