# Lead Capture API

**For website forms — contact, consultation, event registration, newsletter, callback —
that should create leads in the CAS CRM.**

Every form submission POSTs to one endpoint. The lead is de-duplicated, attributed to your
site + campaign, tagged with the form it came from, and lands in the CRM's **Leads** list.

---

## 1. Endpoint

```
POST https://<cas-host>/api/v1/ingest/leads
Content-Type: application/json
Accept: application/json
```

## 2. Authentication

Send your API key (issued by CAS — one per site, managed in **System → Integrations**):

```
X-Api-Key: cas_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Missing/invalid/revoked keys return **401**. Keys are rate-limited per minute (**429** if
exceeded).

## 3. Idempotency (recommended)

Send a stable id per submission so retries never double-create:

```
Idempotency-Key: <your-submission-id>
```

A repeat within **24 hours** returns the original result with header
`Idempotency-Replayed: true`.

---

## 4. Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `first_name` | string | no¹ | ¹ at least one of `email` or `phone` is required |
| `last_name` | string | no | |
| `email` | email | **yes¹** | required unless `phone` is given |
| `phone` | string | **yes¹** | required unless `email` is given |
| `country` | string | no | ISO-2 code (e.g. `PK`, `CN`) |
| `message` | string | no | Free text, ≤ 5000 chars |
| `form_type` | string | no | Which form this is: `contact`, `consultation`, `event`, `callback`, `enquiry`, … (normalised to a slug). Drives triage/segmentation. |
| `fields` | object | no | The form's own extra questions as `key → value` (see §5). Up to 60 keys. |
| `website_domain` | string | no | Your domain, to attribute the lead to a website source |
| `campaign_utm` | string | no | UTM campaign, to attribute the lead to a campaign |
| `passport_no` | string | no | If your form collects it |
| `dob` | date | no | `YYYY-MM-DD` |

## 5. `fields` — the form's own questions

Anything specific to that form goes here and is shown to the counselor under **Form
submission** on the lead. Values are stored as strings.

```json
"fields": {
  "event": "CAS China Expo 2026",
  "event_date": "2026-09-14",
  "seats": "2",
  "preferred_time": "Afternoon"
}
```

---

## 6. Examples

**Contact form**
```json
{
  "first_name": "Bilal", "last_name": "Ahmed",
  "email": "bilal@example.com", "country": "PK",
  "form_type": "contact",
  "message": "Interested in MBBS for Sep 2026.",
  "fields": { "preferred_intake": "September 2026", "how_did_you_hear": "Instagram" },
  "website_domain": "study-mbbs.example", "campaign_utm": "spring-2026-google"
}
```

**Event registration**
```json
{
  "first_name": "Sana", "phone": "+92 301 2223344", "country": "PK",
  "form_type": "event_registration",
  "fields": { "event": "CAS China Expo 2026", "event_date": "2026-09-14", "city": "Lahore", "seats": "2" }
}
```

### curl
```bash
curl -X POST "https://<cas-host>/api/v1/ingest/leads" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -H "X-Api-Key: $CAS_API_KEY" -H "Idempotency-Key: form-2026-000123" \
  --data @lead.json
```

---

## 7. Responses

**201 Created**
```json
{ "lead_id": 123, "student_id": null, "duplicate": false, "review": false }
```

- `duplicate: false`, `review: false` → a clean new lead.
- `review: true` → created, but a probable existing person was flagged for a counselor to check.

**409 Conflict** — the person already exists (matched an existing student or open lead). The
lead is still recorded (for the audit trail) and linked:
```json
{ "code": "DUPLICATE", "message": "Matched existing student", "student_id": 45, "lead_id": 124 }
```

**Errors**

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | `UNAUTHENTICATED` | Missing / invalid / revoked API key |
| 422 | `VALIDATION_ERROR` | Body failed validation (e.g. neither email nor phone) — see `errors{}` |
| 429 | `RATE_LIMITED` | Too many requests this minute |

---

## 8. Public form on the CAS site

The CAS-owned website form uses a separate, key-less endpoint with spam protection and a
generic response (it never reveals whether the person already exists):

```
POST /api/v1/public/enquiries   { first_name, last_name, email, phone, country, message }
```

Partner sites should use the keyed `ingest/leads` endpoint above.
