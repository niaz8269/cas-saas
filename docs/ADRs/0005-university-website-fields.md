# ADR-0005 — University website content fields

**Status:** Accepted (approved by product owner, 2026-07-17)

## Context

The catalog was built for internal operations: a university carried only
`name, code, country, city, website, status`. The product now treats the
catalog as the **content base for the public website**, which needs richer,
presentable data per university.

`docs/schema.sql` is the contract, so new fields are an addendum recorded
here (as with ADR-0003 / ADR-0004).

## Decision

Add the following nullable columns to **`universities`** (addendum block in
`docs/schema.sql`, marked with this ADR):

| Column | Type | Purpose |
|---|---|---|
| `slug` | VARCHAR(190) UNIQUE | URL-friendly identifier for website routes; auto-generated from `name` when omitted |
| `logo_path` | VARCHAR(500) | Logo image — an uploaded object key or an external URL |
| `cover_path` | VARCHAR(500) | Cover/hero image — key or URL |
| `address` | VARCHAR(255) | Campus address |
| `moe_listed` | TINYINT(1) DEFAULT 0 | Whether the university is China MoE-listed (matters for MBBS recognition) |
| `nearest_airport` | VARCHAR(150) | Nearest airport (arrival planning + website) |
| `about` | TEXT | Long-form description |
| `apply_link` | VARCHAR(255) | External apply URL |
| `requirements` | JSON | Admission requirements as a bullet list (array of strings) |
| `representative_professor` | JSON | `{ name, title, photo }` — the CAS representative professor |

Images accept **either** an uploaded file (server-side converted to `.webp`
and stored on S3/MinIO — ADR-0006 / a later step) **or** an external URL;
the column stores whichever reference results. The intake **deadline
counter** on the website is *derived* from the nearest upcoming intake
`application_deadline` — no column.

Alternatives rejected: a separate `university_profiles` table (splits one
aggregate for no gain); storing rich content in a generic settings/KV store
(loses typing, validation and query-ability).

## Consequences

- Table count unchanged (columns added to an existing table).
- `slug` is unique and stable; regenerating it would break website URLs, so
  it is generated once on create and left alone on rename unless explicitly
  changed.
- Any future schema/spec regeneration must include the addendum block.
