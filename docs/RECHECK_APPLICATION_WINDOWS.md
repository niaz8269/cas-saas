# Rechecking university application windows

The public site shows application windows per university from
`backend/database/seeders/OfficialIntakeDatesSeeder.php`. Rows are
`[university name, intake name, opens, closes, status, source URL]`.

Many rows are the last published cycle (autumn 2026, status `closed`), an annual
schedule, or are labelled `unconfirmed`, `third-party`, `listing` or
`placeholder` in the intake name. Universities usually publish 2027 notices
between roughly January and May, so repeat this once a month from February to
June (and after any big notice season).

## Steps

1. Read the seeder and list universities whose newest row is a closed 2026
   window, an annual pattern, or an unconfirmed/third-party row. Start with the
   43 MoE-approved MBBS universities (`universities.moe_listed = 1`), then the
   rest.
2. Look for a 2027 (spring or autumn) international undergraduate/MBBS notice on
   the university's own `.edu.cn` international admissions pages, in Chinese and
   English, HTML or PDF. For PDFs, download them inside the app container with
   `curl` (never `curl -k`), render scanned pages with PyMuPDF and read them.
   Third-party pages are a last resort and must be labelled `unconfirmed` in the
   intake name.
3. Record only dates a page literally states. Do not guess or roll last year's
   dates forward. Skip templated listings that repeat one date across
   universities, and scholarship-only dates (unless the name says scholarship).
4. Edit the seeder. Add a row for the 2027 window (`open` if it has not closed)
   and replace an unconfirmed row once an official page confirms it. Intake
   names must be 80 characters or fewer; escape apostrophes in PHP strings.
5. Run in the container:

   ```bash
   php artisan db:seed --class=OfficialIntakeDatesSeeder
   vendor/bin/pint
   php artisan test --filter=SeedersTest
   ```

6. Commit on a branch, push, and open a pull request. The owner reviews and
   merges it. Public pages must not link to official URLs; those stay in the
   admin portal.

If nothing new is found, do not open a pull request.
