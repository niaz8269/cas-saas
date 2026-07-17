# ADR-0006 — Rename `courses` → `programs`

**Status:** Accepted (approved by product owner, 2026-07-17)

## Context

CAS's domain unit is a **Program** (a university offering a student applies
to), not a "course." The codebase and `schema.sql` modelled it as `courses`
with `course_id` foreign keys across `applications`, `intakes` and
`university_agreements`, and the commission/admissions logic reads
`application.course`. The product owner wants the domain language corrected
end to end (DB, API, UI), not merely relabelled.

## Decision

Rename throughout:

- Table `courses` → **`programs`**.
- Columns `applications.course_id`, `intakes.course_id`,
  `university_agreements.course_id` → **`program_id`**.
- Model `Course` → `Program`; relations `University::courses()` →
  `programs()`, `Application::course()` / `Intake::course()` /
  `UniversityAgreement::course()` → `program()`.
- API resource routes `/api/v1/courses` → **`/api/v1/programs`**; request
  fields `course_id` → `program_id`.

The **program id is the database id** — no separate program-code column is
introduced. The existing fields (name, level, duration_months, tuition_fee,
currency, requirements, status) are kept, and two are **added** to
`programs`:

| Column | Type | Purpose |
|---|---|---|
| `teaching_language` | VARCHAR(60) | Language of instruction (English/Chinese/bilingual) |
| `apply_link` | VARCHAR(255) | Per-program external apply URL |

The rename is delivered as an **in-place migration** (`Schema::rename` +
`renameColumn`) so the existing MySQL data is preserved; the original
create-migrations stay as history. `docs/schema.sql` is updated to the
final `programs` shape.

Alternatives rejected: **relabel-only** (keep `courses` table, show
"Programs" in the UI) — lower risk but leaves the DB/API vocabulary wrong,
which the owner explicitly did not want.

## Consequences

- One necessarily-atomic backend change (DB + models + services +
  controllers + factories + seeders + tests); the commission cascade is
  covered by CommissionEngineTest, which must stay green.
- FK constraint names retain their original `fk_*_course` spelling in the
  live DB (cosmetic); `schema.sql` documents the `program` names.
- Any future schema/spec regeneration reflects `programs`.
