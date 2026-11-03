# SEO runbook

## How it works

The public site is a React SPA, so crawlers would otherwise receive an empty `<div id="root">`. Laravel serves the HTML for public pages instead (`SeoController`, `SeoPageBuilder`, `config/seo.php`):

- injects `<title>`, description, canonical, Open Graph, Twitter and JSON-LD into the built `index.html`;
- puts crawlable content (headings, facts, program lists, internal links) inside `#root`; React replaces it on load;
- returns a real `404` + `noindex` for unknown `/site/*` URLs, `301` for `/site` → `/`, and `noindex` for staff/portal/login paths;
- serves `/robots.txt`, `/sitemap.xml` and `/sitemaps/{pages,universities,cities,news}.xml` dynamically (universities include an image sitemap).

Official university URLs and apply links are never rendered on public pages (admin only).

## Production setup

1. Set in `backend/.env`:
   - `SITE_URL=https://www.cas.moe`
   - `SEO_INDEX_PATH=/path/to/frontend/dist/index.html` (built with `npm run build`)
   - optional `INDEXNOW_KEY=<16-64 alphanumerics>` (served at `/<key>.txt`)
2. nginx must send HTML requests to Laravel, and static assets (`/assets/*`, images) straight from `frontend/dist`:
   - `/`, `/site/*`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/*`, `/{key}.txt` and the fallback → `php-fpm` (`backend/public/index.php`)
   - `/api/*` → Laravel
   - Do **not** use `try_files ... /index.html` for HTML routes, or the shell is bypassed.
3. Serve everything over HTTPS on one canonical host (redirect `cas.moe` → `www.cas.moe`).
4. After each frontend build, `SEO_INDEX_PATH` picks up the new asset hashes automatically.

## Getting indexed

1. Verify the domain in Google Search Console and Bing Webmaster Tools.
2. Submit `https://www.cas.moe/sitemap.xml` in both.
3. Request indexing for the homepage, `/site/mbbs-in-china`, `/site/csc-scholarship`, `/site/universities` and `/site/cities` in Search Console's URL Inspection.
4. Check with URL Inspection that the "crawled page" HTML shows the content, canonical and structured data.
5. Link to the site from the CAS social profiles and any partner pages; new domains with no inbound links are discovered slowly.

Indexing speed is decided by the search engines; this work removes technical blockers but cannot guarantee a date.

## Verify locally

```bash
curl -s http://localhost:8080/site/mbbs-in-china | grep -E "<title>|canonical|application/ld"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/site/does-not-exist   # 404
curl -s http://localhost:8080/robots.txt
```

Backend tests: `php artisan test --filter=SeoTest`.

## Not done yet

- Keyword volumes: the Ahrefs plan and Semrush API units available were insufficient, so page targets were chosen from search intent, not measured volume.
- Localized URLs / `hreflang` for fr, id, zh, ar.
- Program detail pages.
