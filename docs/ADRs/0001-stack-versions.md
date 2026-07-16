# ADR-0001 — Stack version pins & deviations from the original spec

**Status:** Accepted (approved by product owner, 2026-07-17)
**Context:** The technical report (July 2026) and original CLAUDE.md recommended Laravel 11, MailHog, and Tailwind (unversioned). Between the spec's drafting and the build start, ecosystem support windows moved.

## Decisions

| # | Decision | Instead of | Reason |
|---|----------|-----------|--------|
| 1 | **Laravel 12** (PHP 8.3) | Laravel 11 | Laravel 11 security support ended March 2026; starting a fresh production build on an EOL line is indefensible. Same architecture — zero migration cost from a clean start. |
| 2 | **Mailpit** (local mail catcher) | MailHog | MailHog is unmaintained; Mailpit is the actively maintained drop-in with the same SMTP + web-UI workflow. |
| 3 | **Tailwind CSS 4** + shadcn/ui | Tailwind 3.x | shadcn/ui now targets Tailwind v4; its CSS-first `@theme` tokens map 1:1 to the CAS design-system CSS variables. |
| 4 | **Node 22 LTS** (CI/containers) | Node 20 | Node 20 reached EOL April 2026. Local dev on newer Node (24) is fine; CI pins 22 LTS. |
| 5 | Composer `config.platform.php = 8.3.0` | — | Developer machines run PHP 8.5; the platform pin guarantees dependency resolution targets the production PHP 8.3 runtime. |

## Pinned versions (reference)

- Backend: PHP 8.3 · Laravel ^12 · sanctum ^4 · spatie/laravel-permission ^6 · horizon ^5 · MySQL 8.0 · Redis 7 · flysystem-aws-s3-v3 ^3 · Pest ^3
- Frontend: React 18.3 · TypeScript ^5.5 · Vite ^6 · Tailwind ^4 + shadcn/ui · TanStack Query ^5 · Zustand ^5 · React Router ^7 (library mode) · React Hook Form ^7 + Zod ^3 · lucide-react · Recharts ^2 · Vitest

## Consequences

- `CLAUDE.md` stack section updated to match.
- Any future version bump that changes a major line requires a new ADR.
