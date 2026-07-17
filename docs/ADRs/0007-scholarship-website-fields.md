# ADR-0007 — Scholarship website content fields

**Status:** Accepted (approved by product owner, 2026-07-17)

## Context

Like universities and programs, scholarships are part of the public-website
content base. The table carried only `name, type, coverage, criteria,
deadline, status` — enough for internal listing but thin for a scholarship
page a student reads.

`docs/schema.sql` is the contract, so new fields are an addendum recorded
here (as with ADR-0005).

## Decision

Add the following nullable columns to **`scholarships`** (addendum block in
`docs/schema.sql`, marked with this ADR):

| Column | Type | Purpose |
|---|---|---|
| `slug` | VARCHAR(190) UNIQUE | URL-friendly identifier; auto-generated from `name` when omitted |
| `description` | TEXT | Long-form description |
| `amount` | DECIMAL(15,2) | Concrete monetary value (optional; `coverage` remains the free-text summary) |
| `currency` | CHAR(3) | Currency for `amount` |
| `eligibility` | TEXT | Free-text eligibility (alongside the structured `criteria` JSON) |
| `how_to_apply` | TEXT | Application instructions |
| `apply_link` | VARCHAR(255) | External apply URL |

The existing fields are kept. `slug` is generated once on create and left
stable across renames, matching the university convention (ADR-0005).

Alternatives rejected: overloading the `criteria` JSON with prose (loses
typing/validation); a separate content table (splits one small aggregate).

## Consequences

- Table count unchanged (columns added to an existing table).
- Any future schema/spec regeneration must include the addendum block.
