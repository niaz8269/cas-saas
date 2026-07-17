# ADR-0004 — Portal credentials: password columns on agents and students

**Status:** Accepted (approved by product owner, 2026-07-17)

## Context

The report mandates separate Sanctum guards for the portals (§7.1 "guards: staff,
agent, student"; §5.11 "separate student auth guard") and own-scoped portal
endpoints (§5.7, §7.2). But `schema.sql` provides no credential storage for
either portal: `users.password` is the only password column, and `agents` /
`students` carry neither a `password` nor a `user_id` link. Portal login is
impossible without a schema decision.

## Decision

Add two nullable columns to **both** `agents` and `students` (addendum block in
`docs/schema.sql`, marked with this ADR):

```sql
ADD COLUMN password      VARCHAR(255) NULL,   -- NULL = portal not activated
ADD COLUMN last_login_at TIMESTAMP NULL
```

`Agent` and `Student` become the Authenticatables behind the `agent` and
`student` Sanctum guards — exactly what the guards reserved in `config/auth.php`
since M1 intend. A NULL password means the portal account is not activated;
login is refused without revealing activation status.

Alternatives rejected:

- **`portal_accounts` table** — a new table plus a custom auth provider and a
  duplicated email field, for no added capability.
- **Portal logins as `users` rows** (with `users.agent_id` / `users.student_id`)
  — mixes portal identities into the staff RBAC space and denies the agent /
  student guards their own models, contradicting the report's intent.

## Consequences

- Table count stays 51; two tables gain two nullable columns each.
- Portal auth endpoints live under `/api/v1/agent/auth/*` and
  `/api/v1/student/auth/*`; cross-guard tokens are rejected by Sanctum's
  provider model check.
- Any future schema/spec regeneration must include the addendum block.
