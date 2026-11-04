# Deploy checklist

Nothing here changes the app; it lists what has to be true on the server.

## 1. Build
- `cd frontend && npm ci && npm run build` produces `frontend/dist`.
- Backend: `composer install --no-dev --optimize-autoloader`, then `php artisan migrate --force`.
- First deploy only: `php artisan db:seed --force` loads the catalog, logos, photos and dates (long-running; the data files are in `backend/database/data/`).

## 2. Environment (`backend/.env`)
| Variable | Value |
| --- | --- |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL`, `SITE_URL` | `https://www.cas.moe` |
| `SEO_INDEX_PATH` | `/var/www/frontend/dist/index.html` |
| `INDEXNOW_KEY` | optional, 16-64 letters/digits |
| `DB_*`, `REDIS_*`, `MAIL_*` | real production services |
| `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` | the production host(s) |

## 3. Web server
Use `docker/nginx/production.conf.example` (validated with `nginx -t`, and checked end to end: pages, 404, robots.txt, sitemaps, API, cached assets, blocked `.php`). Put TLS in front and redirect `cas.moe` to `www.cas.moe`.

## 4. Accounts and secrets
- The seeded staff users use a demo password. Create real admin accounts and **change or delete every demo account before launch**.
- Set a strong `APP_KEY`; never commit `.env`.
- Real keys for any integration (mail, storage, WhatsApp, etc.) go in the environment, not the repo.

## 5. After the first deploy
- Open `/robots.txt`, `/sitemap.xml` and `/site/mbbs-in-china`; the page source must show a title, canonical and JSON-LD.
- Submit the sitemap in Google Search Console and Bing Webmaster Tools (see `docs/SEO.md`).
- Run the queue worker and scheduler (`worker` and `scheduler` services in `docker/compose.yml`).
