# CLAUDE.md — CAS Education ERP & CRM Platform

> This file is the standing context for the project. Claude Code loads it automatically. Follow it in every session. When something here conflicts with a one-off request, ask before deviating.

## Project
Centralized ERP & CRM for **CAS — Consultancy for Abroad Study** (www.cas.moe), placing students into universities in China. Authoritative spec: **`docs/CAS_Education_ERP_Technical_Report.pdf`**. Database contract: **`docs/schema.sql`** (MySQL 8, 50 tables). Always align to these; propose changes before making them.

## Golden rules
1. **Work step by step.** Small, reviewable increments. After each step: how to verify → run tests → commit → short summary → **stop for review**. Never build the whole app in one go.
2. **Ask before** adding a dependency, changing the schema, or deviating from this file.
3. **Security is server-side.** Never trust the client. Deny-by-default. Enforce RBAC + record scope on every endpoint.
4. **No secrets in code.** Use `.env`; keep `.env.example` updated.
5. **Match `schema.sql`.** Generate migrations from it; keep names/types identical.
6. **Sleek and simple** always wins over busy. When unsure about UI, choose the calmer, more minimal option.

## Stack (pinned)
- **Backend:** Laravel 12, PHP 8.3, MySQL 8, Redis, Sanctum (multi-guard: staff/agent/student), `spatie/laravel-permission`, Horizon (queues), Scheduler (SLA/escalations). *(Laravel 12 per ADR-0001 — Laravel 11 security support ended March 2026.)*
- **Frontend:** React 19 + TypeScript, Vite, **Tailwind CSS 4 + shadcn/ui**, TanStack Query, Zustand, React Router, React Hook Form + Zod, lucide-react icons, Recharts for charts. *(React 19 per ADR-0002.)*
- **Storage:** S3-compatible (MinIO locally) with pre-signed URLs + access logging.
- **Local infra:** Docker Compose — services: `app` (php-fpm+nginx), `mysql`, `redis`, `minio`, `mailpit`, `frontend` (Vite). *(Mailpit per ADR-0001 — MailHog is unmaintained.)*
- **CI:** GitHub Actions — lint, backend tests, frontend build/tests.

## Repo structure
```
/backend      Laravel API
/frontend     React + Vite SPA
/docs         technical report, schema.sql, ADRs
/docker       compose + service configs
CLAUDE.md
```

## API conventions
- Versioned under `/api/v1`, JSON in/out, `Authorization: Bearer` tokens.
- Pagination `?page&per_page` → `meta{}`; filtering `filter[field]=`; sorting `sort=-created_at`; search `q=`.
- Errors: `{ "message", "errors": {field:[...]}, "code" }` with proper HTTP status (401/403/404/409/422/429).
- Lead ingestion: API-key auth, `Idempotency-Key`, source-tagged, rate-limited.

## Data & integrity
- Soft deletes (`deleted_at`) on business tables; global scope excludes deleted.
- Immutable `*_status_history` tables for lifecycle changes; financial corrections are adjusting entries, never overwrites.
- Audit log (actor, action, entity, before/after, ip, ua) on create/update/delete of: user, role, student, application, invoice, payment, commission, visa_case. Log view/download of sensitive documents.

## RBAC record scopes
`global` (all) · `branch` · `department` · `assigned` · `own`. Roles: Super Admin, Management, Admin/Operations, Counselor, Admissions, Finance, Visa, Marketing, Agent, Student. Use the report's module×role matrix as the baseline; enforce via policies.

## Commission lifecycle (must be modeled exactly)
`expected → pending_arrival → eligible → invoiced → received`; agent side `agent_payable → agent_paid`. CAS becomes eligible only after **arrival + registration + first-year fee paid**. Every transition writes to `commission_status_history`.

---

## Design System (sleek & simple)

**Principle:** calm, minimal, professional, fast. Generous whitespace, strong hierarchy, restrained color. Navy is the brand; red is a rare accent (destructive/important only). Most of the UI is white + neutral gray with navy for primary actions and nav.

### Brand palette (from the logo)
Define these as CSS variables / Tailwind theme tokens:
```
--cas-navy:        #14357C   /* primary — brand navy, buttons, active nav, headings */
--cas-navy-700:    #0F2A63   /* hover/pressed, sidebar */
--cas-navy-50:     #EAF0FB   /* tints, active row, selected chip */
--cas-red:         #D81F26   /* accent — destructive, alerts, critical badges ONLY */
--cas-red-50:      #FCEBEC
--ink:             #1F2933   /* body text */
--muted:           #64748B   /* secondary text */
--line:            #E2E8F0   /* borders / dividers */
--bg:              #FFFFFF   /* surfaces */
--bg-subtle:       #F6F8FC   /* app background, table header, cards */
--success:         #15803D
--warning:         #B45309
```
Tailwind: map `primary → --cas-navy`, `destructive → --cas-red`. **Do not** color large areas red; red is for emphasis and danger only.

### Typography
- Font: **Inter** (fallback: Segoe UI, system-ui). Headings 600–700, body 400–500.
- Scale: page title 24px · section 18px · card title 15px · body 14px · meta 12px. Comfortable line-height (1.5).

### Layout shell
- **Fixed left sidebar** (≈240px): CAS logo at top, grouped nav with lucide icons, active item = navy-50 background + navy text/indicator. Collapsible to icons on tablet.
- **Topbar**: page title/breadcrumb left; global search, notifications bell, user menu right. Thin bottom border, white.
- **Content**: `--bg-subtle` background, white cards with `--line` borders, `rounded-xl`, subtle shadow (`shadow-sm`), 16–24px padding.

### Components (shadcn/ui, styled minimal)
- **Buttons:** primary = solid navy; secondary = white with border; destructive = red; ghost for low-emphasis. Medium radius, no gradients.
- **Tables:** the workhorse. Sticky header (bg-subtle), 40px rows, hover highlight, zebra optional/off by default, right-aligned numbers, status **badges** (soft tinted: navy/green/amber/red), row actions in a `⋯` menu. Toolbar above: search + filters + primary action. Pagination bottom-right.
- **Forms:** single-column, grouped in cards, clear labels above inputs, inline validation (Zod), helper text muted, sticky save bar for long forms.
- **Badges/status:** soft background + darker text, never loud. Map each lifecycle status to a consistent color.
- **Cards/KPIs:** dashboard = a tidy grid of KPI cards (big number, label, small trend) + a few charts. No clutter.
- **Empty states:** friendly, with a single primary action.
- **Feedback:** toasts for success/error; skeletons for loading; confirm dialogs for destructive actions.

### Charts
Recharts, minimal: thin axes, muted gridlines, navy primary series, one accent max, tooltips on hover. No 3D, no heavy legends.

### Motion & feel
Fast and subtle: 150–200ms transitions, gentle hover states. Nothing bouncy. Prioritize perceived speed (optimistic UI where safe, skeletons).

### Accessibility
WCAG AA contrast, full keyboard nav, visible focus rings (navy), proper labels/ARIA, respect reduced-motion.

### Brand usage
- Logo (`cas-logo.png`) in the sidebar header and on the login screen; keep clear space around it; never stretch or recolor.
- Use the logo/navy header on generated PDFs (invoices, offers, statements).
- Login screen: clean centered card on `--bg-subtle`, logo on top, minimal fields, navy primary button.

### Responsive
Admin is desktop-first but must be usable on tablet (collapsible sidebar, horizontally scrollable tables). **Student and Agent portals are mobile-first** — simple stacked cards, large tap targets, bottom-safe layouts.

## Definition of Done (every feature)
- [ ] Server-side validation + policy/RBAC scope enforced and tested
- [ ] Matches schema; migration + seeder updated
- [ ] Audit/history where applicable
- [ ] UI follows this design system; responsive; AA accessible
- [ ] Feature test (API) and/or component test passing
- [ ] Loading, empty, and error states handled
- [ ] Committed (Conventional Commits) with a short summary, then pause for review
