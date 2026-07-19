# Application Ingestion API

**For partner sites (e.g. the Xinjiang Medical University admissions site) that collect
direct university-admission applications and push them into the CAS ERP.**

Each submitted application — the student's full profile, guardians, education history and
document files — is POSTed to one endpoint. It lands directly in the CAS **Applications**
section, tagged with your source, flagged *To verify*, and routed to an Admissions officer.

---

## 1. Endpoint

```
POST https://<cas-host>/api/v1/ingest/applications
Content-Type: application/json
Accept: application/json
```

## 2. Authentication

Every request must carry your API key:

```
X-Api-Key: cas_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Keys are issued by CAS (one per source), stored hashed, and can be revoked. A missing,
invalid, or revoked key returns **401**. Keys are rate-limited per minute; exceeding the
limit returns **429**.

Your key is bound on the CAS side to a **university** and a **default program** (e.g.
Xinjiang Medical University → MBBS). You therefore do **not** need to send a program — every
application from your key is filed under that program unless you explicitly override it (see
`program_id`).

## 3. Idempotency (recommended)

Send a stable unique id per application so retries never create duplicates:

```
Idempotency-Key: <your-application-uuid>
```

A repeat of the same key within **24 hours** returns the original result unchanged, with the
header `Idempotency-Replayed: true`. Use your own primary key / submission id for this value.

---

## 4. Request body

Top-level fields:

| Field             | Type   | Required | Notes |
|-------------------|--------|----------|-------|
| `student`         | object | **yes**  | See §4.1 |
| `emergency_contact` | object | no     | See §4.2 |
| `guardians`       | array  | no       | ≤ 5; see §4.3 |
| `education`       | array  | no       | ≤ 6; see §4.4 |
| `documents`       | array  | no       | ≤ 20; see §4.5 |
| `program_id`      | int    | no       | Override the key's default program. Must exist in CAS. |
| `degree`          | string | no       | What the applicant declared (e.g. `"Bachelor's Degree"`). Recorded for reference. |
| `major`           | string | no       | What the applicant declared (e.g. `"MBBS"`). Recorded for reference. |
| `custom_fields`   | object | no       | Any extra fields your form collects that aren't in this spec (see §4.6). |

> The API accepts common field **aliases** so you can send your form's own labels. Where an
> alias is listed, either name works; the canonical name wins if both are sent.

> **Extra fields are never lost.** Any field you send inside `student` that isn't listed here
> is automatically preserved as a custom field — so a different university's form with its own
> extra questions works without any change on the CAS side.

### 4.1 `student` (required)

| Field | Type | Required | Max | Aliases / notes |
|-------|------|----------|-----|-----------------|
| `first_name` | string | **yes** | 100 | `given_name` |
| `last_name` | string | no | 100 | `surname`, `family_name` |
| `chinese_name` | string | no | 120 | |
| `email` | email | **yes¹** | 190 | ¹ required unless `passport_no` is given |
| `alternate_email` | email | no | 190 | |
| `phone` | string | no | 30 | `tel`, `telephone`, `mobile` |
| `wechat_id` | string | no | 80 | |
| `skype_id` | string | no | 80 | |
| `passport_no` | string | no | 50 | required unless `email` is given |
| `passport_expiry_date` | date | no | | `passport_expiry`. Format `YYYY-MM-DD`. |
| `dob` | date | no | | `YYYY-MM-DD` |
| `gender` | enum | no | | `male` \| `female` \| `other` (case-insensitive) |
| `marital_status` | string | no | 20 | |
| `religion` | string | no | 60 | |
| `native_language` | string | no | 60 | |
| `nationality` | string | no | 100 | Country **name** (`"Pakistan"`) or ISO-2 code (`"PK"`) |
| `place_of_birth` | string | no | 120 | Or send `country_of_birth` + `city_of_birth` and they'll be combined |
| `city` | string | no | 120 | |
| `current_address` | string | no | 255 | `present_address` |
| `permanent_address` | string | no | 255 | |

At least one of `email` or `passport_no` is required (that's how we de-duplicate against
existing students — a match updates the existing student rather than creating a new one).

### 4.2 `emergency_contact`

Recorded on the student profile as a contact.

| Field | Type | Required | Max | Aliases |
|-------|------|----------|-----|---------|
| `name` | string | **yes²** | 150 | ² required only if the object is present |
| `relation` | string | no | 50 | `relationship` |
| `phone` | string | no | 30 | `tel`, `telephone` |
| `email` | email | no | 190 | |
| `address` | string | no | 255 | |

### 4.3 `guardians[]` (≤ 5)

| Field | Type | Required | Max |
|-------|------|----------|-----|
| `relation` | string | **yes** | 50 |
| `name` | string | **yes** | 150 |
| `phone` | string | no | 30 |
| `email` | email | no | 190 |
| `address` | string | no | 255 |

### 4.4 `education[]` (≤ 6)

| Field | Type | Required | Max | Aliases |
|-------|------|----------|-----|---------|
| `level` | string | no | 40 | e.g. `"Senior High School"` |
| `degree_name` | string | no | 150 | `degree`, `qualification` |
| `major` | string | no | 150 | `field`, `field_of_study`, `subject` |
| `institution` | string | no | 190 | |
| `start_year` | int | no | | `start_date`, `from`, `from_year` — a year is extracted from a full date |
| `end_year` | int | no | | `end_date`, `to`, `to_year` |
| `grade_value` | string | no | 30 | |

### 4.5 `documents[]` (≤ 20)

| Field | Type | Required | Max | Notes |
|-------|------|----------|-----|-------|
| `type` | string | **yes** | 120 | e.g. `"Passport"`, `"Educational document"`, `"Police clearance"` |
| `file_name` | string | **yes** | 255 | Original filename incl. extension |
| `mime` | string | no | 120 | e.g. `image/jpeg`, `application/pdf` |
| `content` | string | **yes** | | The file's raw bytes, **Base64-encoded** |

Send each file's bytes Base64-encoded in `content`. Keep individual files reasonable
(a few MB). A document whose Base64 cannot be decoded is skipped; a storage failure aborts
the whole request (so you can safely retry with the same `Idempotency-Key`).

### 4.6 `custom_fields` — anything extra

A flat object of `key → value` for fields your form collects that aren't in this spec
(e.g. blood group, hostel preference, a scholarship reference). Values are stored as strings
and shown to reviewers under **Additional information**. Up to 60 keys; values ≤ 2000 chars.

```json
"custom_fields": { "blood_group": "B+", "hostel_required": "yes", "referral_code": "AG-2231" }
```

You don't have to use this bag: any unrecognized field placed directly inside `student` is
captured the same way automatically. `custom_fields` is just the explicit, self-documenting
option.

---

## 5. Responses

**201 Created**

```json
{
  "application_id": 18,
  "application_code": "APP-2026-00018",
  "student_code": "STU-2026-00011",
  "status": "under_review"
}
```

A replayed idempotent request returns the same body plus header
`Idempotency-Replayed: true`.

**Errors**

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | `UNAUTHENTICATED` | Missing / invalid / revoked API key |
| 422 | `VALIDATION_ERROR` | Body failed validation — see `errors{}` for per-field messages |
| 429 | `RATE_LIMITED` | Too many requests for this key this minute |

Error shape:

```json
{ "message": "…", "errors": { "student.first_name": ["…"] }, "code": "VALIDATION_ERROR" }
```

---

## 6. Complete example

```http
POST /api/v1/ingest/applications HTTP/1.1
Host: cas.example
Content-Type: application/json
Accept: application/json
X-Api-Key: cas_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Idempotency-Key: xjmu-2026-000123
```

```json
{
  "degree": "Bachelor's Degree",
  "major": "MBBS",
  "student": {
    "given_name": "Ayesha",
    "surname": "Shakeel",
    "chinese_name": "黄佳佳",
    "dob": "2005-06-25",
    "gender": "Female",
    "marital_status": "Single",
    "country_of_birth": "Pakistan",
    "city_of_birth": "Gujranwala",
    "religion": "Islam",
    "nationality": "Pakistan",
    "native_language": "Urdu",
    "passport_no": "UD5164361",
    "passport_expiry": "2035-11-12",
    "present_address": "Khyali shahpur, sardar colony st 11",
    "permanent_address": "Khyali shahpur, sardar colony st 11",
    "tel": "03004775417",
    "email": "ayesha@example.com",
    "alternate_email": "ayesha.alt@example.com",
    "wechat_id": "wxid_x8hofj6fjr5t22"
  },
  "emergency_contact": {
    "name": "Arfa",
    "relationship": "Parent",
    "tel": "03338234478",
    "email": "arfa@example.com",
    "address": "Khyali shahpur, sardar colony st 11"
  },
  "education": [
    { "level": "Senior High School", "field": "Pre-medical",
      "institution": "Punjab Group of Colleges", "start_date": "2022-01-13", "end_date": "2025-06-13" },
    { "level": "Junior High School", "field": "Science",
      "institution": "The Royal School of Science", "start_date": "2020-06-13", "end_date": "2021-10-13" }
  ],
  "documents": [
    { "type": "Passport", "file_name": "passport.jpeg", "mime": "image/jpeg", "content": "<base64>" },
    { "type": "Educational document", "file_name": "fsc-certificate.pdf", "mime": "application/pdf", "content": "<base64>" }
  ]
}
```

### curl

```bash
curl -X POST "https://<cas-host>/api/v1/ingest/applications" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Api-Key: $CAS_API_KEY" \
  -H "Idempotency-Key: xjmu-2026-000123" \
  --data @application.json
```

---

## 7. What happens on the CAS side

1. The student is matched by `email`/`passport_no` (updated) or created with a new
   `STU-YYYY-NNNNN` code.
2. Guardians, the emergency contact, and education records are attached to the student.
3. An application is created under your key's university + program, tagged with your source
   and flagged **To verify**, and routed to the least-loaded Admissions officer (who is
   notified). Its status is `under_review`.
4. Documents are stored and attached; an Admissions officer verifies them before the
   application proceeds.

## 8. Getting a key (CAS operators)

```bash
php artisan cas:api-key "XJMU Admissions Site" \
  --type=website --url=https://<partner-site> \
  --university=<university_id> --program=<default_program_id> --rate=120
```

The plaintext key is printed **once** — copy it immediately and hand it to the partner over a
secure channel. It is stored only as a hash and cannot be recovered.
