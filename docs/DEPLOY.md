# Deploy checklist

Nothing here changes the app; it lists what has to be true on the server.

## 1. Build
- `cd frontend && npm ci && npm run build` produces `frontend/dist`.
- Backend: `composer install --no-dev --optimize-autoloader`, then `php artisan migrate --force`.
- First deploy only: `php artisan db:seed --force` loads the catalog, logos, photos, dates, programs and scholarships (long-running, roughly 10 to 15 minutes; the data files are in `backend/database/data/`). A dry run on an empty MySQL database with `APP_ENV=production` produced 304 universities, 55,396 programs and 347 scholarships with no errors.
- Then create the first admin: `php artisan cas:create-admin you@cas.moe "Your Name"` (asks for the password, hidden, at least 12 characters).

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
- With `APP_ENV=production` the seeder **does not create the demo staff accounts** (their emails and password are public in the repo). Create real staff with `cas:create-admin`, then add the rest from the Users screen. Never set `DEMO_PASSWORD` in production.
- If a demo database was ever restored into production, delete every `@cas.moe` demo user and rotate all passwords before launch.
- Set a strong `APP_KEY`; never commit `.env`.
- Real keys for any integration (mail, storage, WhatsApp, etc.) go in the environment, not the repo.

## 5. After the first deploy
- Open `/robots.txt`, `/sitemap.xml` and `/site/mbbs-in-china`; the page source must show a title, canonical and JSON-LD.
- Submit the sitemap in Google Search Console and Bing Webmaster Tools (see `docs/SEO.md`).
- Run the queue worker and scheduler (`worker` and `scheduler` services in `docker/compose.yml`).

## 6. Fees and contact details (set once, no code change)
- Application fee amounts (500 CNY scholarship, 1,000 CNY self-funded) live in the `finance.processing_fee` setting; payment instructions in `finance.payment_instructions` (shown to students on the fee voucher). Set the payment instructions before launch, otherwise students are told to ask their counselor.
- Public contact details (WhatsApp, WeChat ID and QR, emails) are in `frontend/src/lib/contact.ts` and `frontend/public/images/wechat-qr.jpg`.

## 7. Known and accepted
- Document uploads need S3-compatible storage (`FILESYSTEM_DISK`/`AWS_*`); the local MinIO is for development only.
- `npm audit` reports one high advisory in `zod` (memory use when a form validates an oversized list). It affects only the visitor's own browser tab and the fix is a major upgrade (3 to 4); schedule it after launch.
- Dependencies were updated for security on the deploy-readiness branch (Laravel 12.71, Guzzle, dompdf, commonmark, Symfony, Tiptap); `composer audit` is clean.
