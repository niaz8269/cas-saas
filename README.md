# CAS SAAS — CAS Education ERP & CRM Platform

[![CI](https://github.com/niaz8269/cas-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/niaz8269/cas-saas/actions/workflows/ci.yml)

Centralized ERP & CRM for **CAS — Consultancy for Abroad Study** ([www.cas.moe](https://www.cas.moe)), an international education consultancy placing students into universities in China.

Leads flow in from 100+ university websites, agents and campaigns, and move through a controlled lifecycle — **Lead → Admin assignment → Counselor qualification → Admissions → Finance → Visa → Pre-arrival → Arrival + first-year payment** — with one permanent student identity, a full audit trail, and a commission lifecycle (`expected → pending_arrival → eligible → invoiced → received`) distributed down an agent hierarchy.

## Source of truth

| File | Role |
|---|---|
| [`docs/CAS_Education_ERP_Technical_Report.pdf`](docs/) | Authoritative architecture, modules, API & security spec |
| [`docs/schema.sql`](docs/schema.sql) | Database contract — MySQL 8, 50 tables. Migrations are generated from this, names/types identical. |
| [`CLAUDE.md`](CLAUDE.md) | Standing engineering rules: stack, conventions, design system, quality bar |
| [`docs/ADRs/`](docs/ADRs/) | Architecture decision records |

## Stack

- **Backend:** Laravel 12 (PHP 8.3) REST API · MySQL 8 · Redis 7 · Sanctum (staff/agent/student guards) · spatie/laravel-permission · Horizon
- **Frontend:** React 19 + TypeScript · Vite · Tailwind CSS 4 + shadcn/ui · TanStack Query · Zustand · React Router · RHF + Zod
- **Storage:** S3-compatible (MinIO locally), pre-signed URLs, access-logged
- **Local infra:** Docker Compose (app, mysql, redis, minio, mailpit, frontend)
- **CI:** GitHub Actions

## Repo structure

```
/backend      Laravel API
/frontend     React + Vite SPA
/docs         technical report, schema.sql, ADRs
/docker       compose + service configs
```

## Getting started

> 🚧 M0 (scaffold) in progress. Once complete:

```sh
docker compose -f docker/compose.yml up -d
# API   → http://localhost:8080/api/v1  (health: /health)
# SPA   → http://localhost:5173
# Mail  → http://localhost:8025  (Mailpit)
# MinIO → http://localhost:9001
```

## Milestones

M0 Scaffold · M1 Identity/Org/Access · M2 Catalog & Agreements · M3 Lead & Student CRM · M4 Admissions · M5 Finance & Commission · M6 Visa · M7 Portals · M8 Comms & Automation · M9 Analytics

## License

Private — all rights reserved.
