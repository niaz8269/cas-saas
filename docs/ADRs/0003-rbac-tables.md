# ADR-0003 — RBAC tables: schema.sql naming + one addendum table

**Status:** Accepted (approved by product owner, 2026-07-17)

## Context

`schema.sql` declares the RBAC tables as "spatie-compatible", and three of five match
spatie/laravel-permission exactly (`roles`, `permissions`, `model_has_roles`). Two diverge:

1. The role↔permission pivot is named **`role_permissions`** (spatie default: `role_has_permissions`).
2. **`model_has_permissions` is absent** — but spatie's permission resolution queries it
   internally (direct user-level grants), so its absence breaks `hasPermissionTo()` paths.

## Decision

- Honor `schema.sql` naming: spatie's `table_names.role_has_permissions` config points at
  **`role_permissions`**.
- **Add `model_has_permissions`** (same shape as spatie's default, index/FK names in the
  schema's style: `idx_mhp_model`, `fk_mhp_perm`). `docs/schema.sql` gains an addendum
  block marked with this ADR; the table count becomes **51**.

Alternatives rejected: renaming to pure spatie defaults (drifts the DB from the contract);
strict roles-only RBAC (requires overriding spatie internals; blocks per-user grants the
module matrix may need, e.g. one counselor temporarily granted document verification).

## Consequences

- Migrations generate all five RBAC tables; `config/permission.php` carries the mapping.
- Any future schema/spec regeneration must include the addendum block.
