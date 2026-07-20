# CAS Public Website — Reference Audit & Rebuild Plan

**Reference:** cucas.cn · **Target:** cas.moe `/site` (React app) · **Prepared:** 2026-07-20
**Brand preserved:** CAS navy `#14357C` + gold accent, logo, domain, contact.

> Local working document. Nothing has been implemented yet — this is the analysis/plan stage.

---

## How this analysis was gathered (and its limits)

This environment has **no interactive click-through browser or devtools**, so I could not literally hover
elements, trigger modals, or read computed animation timings. `www.cucas.cn` also sits behind a JS anti-bot
challenge. I routed around both by fetching the **mobile site (`m.cucas.cn`)**, the per-university subdomains,
and search-engine indexing — which exposed the full route map, filters, form fields, card schemas and copy
strategy. Everything about **structure / routes / fields is _observed_**; **animation & micro-interaction
notes are _inferred_** from those patterns and flagged as such.

---

## 1. The reference, at a glance

CUCAS is a study-in-China admissions marketplace. Its entire design serves one funnel:
**discover → get a study plan → talk to a counselor → apply for free.**

- **300+** universities — browsable by ranking, 985/211 tier, type, city.
- **20k+** programs — degree & non-degree, ~12 field categories + culture/language courses.
- **60k+** students placed — headline trust number, repeated with testimonials + partner endorsements.

**The conversion engine (what actually makes it work):**
- **"Make your study plan" (`/student_plan`)** — a ~3-min assessment that routes to a human counselor with
  "personalized schools & programs." Primary hook, surfaced everywhere.
- **Counselor lead form (`/counselor/contact`)** — rich qualifying capture: name, nationality, birthday,
  degree, funding source, intake/apply dates, average score, reason to study, WhatsApp.
- **"Apply for free · no application/service fees · 20 minutes"** — repeated friction/cost-removal hook.
- **Persistent Sign In / Join for Free** + a "Counselor" contact entry on every page.
- **Trust stack** — 60k+ students, 300+ universities, 25+ testimonials, endorsements from 13+ international bodies.

---

## 2. Reference information architecture

| Nav item | Route | What it is |
|---|---|---|
| Home | `/` | Hero search, how-it-works, featured unis/scholarships, trust, news. |
| Study Plan | `/student_plan` | Lead-gen assessment → counselor recommendations. |
| University | `/school` · `/school/detail?sid=` | Directory (ranking / 985 / 211 / type / city, A–Z) → rich university microsite. |
| Program | `/program` | Degree vs non-degree, ~12 field categories + culture/language/training courses. |
| City | `/city` · `/city/detail?cityid=` | City cards (type, climate, living cost) → intro + universities in that city. |
| Scholarship | `/scholarship` · `/scholarship/detail?sid=` | Filter by degree category, A–E tier, language, semester, university. |
| Future Student | `/feature_student` | Content hub — tabs: HOT / NEWS / ADMISSION (guides, listicles). |
| FAQ | `/faq` | Accordion, ~13 categories, 80+ questions. |
| About / Services | `/server` · `/server/details?id=` | Brand story, service catalog, partners, testimonials. |
| Counselor | `/counselor/contact` | The qualifying lead form. |
| Auth | `/login` · `/reg` | Sign in / Join for free. |

Also present: per-university subdomains (`thu.`, `hust.`, `cdu.cucas.cn`), degree landings
(`bachelor.`, `master.cucas.cn`), a news subdomain (`news.cucas.cn`), a community (`tribe.cucas.cn`)
and a help centre (`help.cucas.cn`).

**Observed filters/taxonomy:**
- **Universities:** ranking (China rank / popularity / A–Z), classification (985 / 211 / ordinary), type (public/private), city; A–Z index.
- **Programs:** Degree vs Non-degree. Non-degree → Hot Courses (Chinese/HSK/camps), Cultural (martial arts, tea,
  calligraphy, cooking), Training (intl relations, medical, business), Other. Degree → Economics & Management,
  Medicine, Engineering, Computer & Info Science, Humanities, Law & Political Science, Architecture, Education,
  Science & Mathematics, Agriculture, MBA, Other.
- **Scholarships:** degree category (Non-degree/Bachelor/Master/Doctor), scholarship category (A–E tiers),
  program, university (200+), language (All/Chinese/English), semester (All/Spring/Autumn), Reset.
- **City card:** "Study in {City}", description, type (metropolis/humanities/historical/coastal/ordinary),
  climate (ordinary/cold/hot), living cost (RMB range), links: "City Introduction" + "View Universities".

**University detail (per-university microsite) tabs:** Admission, Accommodation, Facilities, Fees Structures,
Scholarship, Documents, Choosing Reasons, Ranking, Video, 3D Map, Visa Application, Routine Guide,
Registration, Check-in, Authorization. Fact header: attribute (public), level (ordinary), type
(comprehensive), location, founded, tagline. Reviews with per-category ratings. CTAs: Apply Now, Check Now, Download.

**Counselor lead form fields (verbatim):** Name*, Birthday*, Nationality*, Email*, Planning Intake Date,
Planning Application Date, Degree* (Non-degree/Bachelor/Master/Doctor), Program You Want, Funding Resource*
(Self-finance/Scholarship), Average Score* (Below 60% … 90–100%), Reason to Study in China*, WhatsApp. → Submit.

**Services (`/server`):** University Application, Accommodation Booking, Airport Pickup, Money Transfer, VPN;
+ business: University Advertising, Jobs/Internships, Agency Cooperation.

**FAQ categories:** Study in China, Select a Program, Apply Online, About Scholarship, Choose a School,
Manage Account, Application Submission, Application Tracking, Paying Fees, Application Preparation
(+ Application Guidance, Payment Methods, Follow-up Service, About).

*Inferred interactions* (from layout + conventions, not directly observed): sticky header that condenses on
scroll, dropdown mega-menus, accordion expand/collapse, filter chips with live result counts, a floating
"Talk to a counselor" button, carousel/marquee for partner logos, count-up stats on scroll. Reproduce as
tasteful 150–200 ms transitions consistent with the CAS design system.

---

## 3. What CAS already has (reuse first)

The CAS `/site` app already mirrors the reference's spine — **refactor-and-extend, not rebuild-from-zero.**

- **Layout, nav & footer** — `SiteLayout` with Universities/Programs/Scholarships mega-menus, announcement
  banner, navy+gold footer with social & `+86` contact. **KEEP.**
- **Homepage** — `SiteHome` (427 lines): hero + search tabs, stats, weekly featured university, highlights,
  outstanding programs, featured-content tabs, watch&learn, testimonials, more-universities, search CTA. **REFACTOR.**
- **Discovery** — `SiteUniversities` (103), `SiteUniversity` (220), `SiteProgramFinder` (171),
  `SiteScholarships` (117). **REFACTOR — add filters & depth.**
- **Thin pages** — `SiteServices` (67), `SiteWhyChina` (68), `SiteNews` (64), `SiteContact` (68),
  `SiteAbout` (98). **BUILD OUT.**
- **Public API** — only `GET /public/universities` & `POST /public/enquiries` today. New sections need a few
  more read endpoints. **EXTEND.**

---

## 4. Page-by-page rebuild plan

Legend: **Keep** = largely as-is · **Refactor** = extend existing · **New** = build new page/flow.

| Reference pattern | CAS page | Status | What to do |
|---|---|---|---|
| Home funnel | `SiteHome` | Refactor | Weave in a study-plan CTA band, a city strip, a partners/trust bar and a clearer how-it-works. Keep hero + search. |
| `/counselor/contact` | `SiteContact` | Rebuild | Replace thin form with the qualifying lead form (nationality, degree, funding, intake, score, reason, WhatsApp) → `POST /public/enquiries`. Add offices + channels. |
| `/student_plan` | **new** `SiteStudyPlan` | New | Multi-step "free study plan in 3 minutes" wizard that submits an enriched enquiry. Highest-ROI addition. |
| `/school` + detail | `SiteUniversities` / `SiteUniversity` | Refactor | Add ranking/tier/type/city filters + A–Z; tabbed detail (admission, fees, accommodation, scholarships, visa, reviews). |
| `/program` | `SiteProgramFinder` | Refactor | Degree vs non-degree tabs + field-category taxonomy + language/city/intake. |
| `/scholarship` | `SiteScholarships` | Refactor | Filters: degree category · tier · language · semester; explain scholarship tiers up front. |
| `/city` + detail | **new** `SiteCities` / `SiteCity` | New | City cards (type · climate · living cost) → city intro + "universities here". New primary-nav entry. |
| `/faq` | **new** `SiteFAQ` | New | Categorised accordion; strong SEO surface. Content authored for CAS. |
| `/server` | `SiteServices` + `SiteAbout` | Rebuild | Service cards (application, accommodation, airport pickup, visa, scholarship), why-CAS, partners, testimonials, stats. |
| `/feature_student` + news | `SiteNews` → resources hub | Rebuild | HOT / guides / admission content hub with article detail; feeds SEO + nurture. |
| Global conversion chrome | `SiteLayout` | Refactor | Floating "Talk to a counselor" widget + sticky apply CTA + condense-on-scroll header + trust strip. |

---

## 5. Data & backend the site will need

- **New public read endpoints:** `GET /public/programs`, `/public/scholarships`, `/public/cities` (+ detail) —
  active, website-safe projections mirroring the existing `/public/universities` pattern.
- **Enquiry enrichment:** study-plan & counselor forms post to existing `POST /public/enquiries`; the extra
  qualifying fields ride in `form_fields` (already flexible) and land as source-tagged leads.
- **FAQ & resources content:** author as structured content (static config or a light CMS table). No schema
  change needed to ship v1 as curated content.
- **SEO baseline:** per-page `<title>`/meta/OG, semantic headings, clean `/site/*` URLs, JSON-LD
  (Organization, Course, FAQPage), internal linking between unis ↔ programs ↔ cities ↔ scholarships.

> Anything requiring a real schema change (e.g. a persistent cities table or a CMS) will be flagged and
> confirmed before building — per the project's "ask before schema" rule.

---

## 6. Brand-preservation rules (non-negotiable)

- **Identity stays CAS.** Logo `cas-logo.png`, domain `cas.moe`, navy `#14357C` + gold accent, existing footer
  contact. No CUCAS logo, name, imagery or copy anywhere.
- **All copy rewritten for CAS** — Consultancy for Abroad Study, placing students into Chinese universities.
  We reproduce *structure & UX*, never their text.
- **Reproduce patterns, not assets.** Components, flows, filters and conversion mechanics recreated; their
  proprietary content, testimonials and partner marks are not copied.
- **Reuse the CAS design system** — shadcn/Tailwind tokens, 150–200 ms motion, AA contrast, mobile-first.
  New pages inherit `SiteLayout`.

---

## 7. Proposed build roadmap

Sequenced so each phase ships independently, tested, in small reviewable commits.

- **Phase A — Conversion core (RECOMMENDED START).** Rich Contact lead form → enquiries · new *Study Plan*
  3-step wizard · floating "Talk to a counselor" widget · sticky apply CTA + trust strip in the layout.
  Turns traffic into leads immediately.
- **Phase B — Discovery depth.** University directory filters (ranking/tier/type/city + A–Z) and a tabbed
  university detail; program-finder taxonomy; scholarship filters & tier explainer. Needs the new public read endpoints.
- **Phase C — New sections.** City browsing (+ detail), categorised FAQ, rebuilt Services/About with partners
  & testimonials, News/resources hub. Mostly self-contained & SEO-rich (visible quick wins).
- **Phase D — Home & polish.** Fold cities, study-plan band, partners/stats and how-it-works into the home;
  scroll/hover micro-interactions; per-page meta/OG/JSON-LD; responsive & performance sweep.

---

## 8. Homepage component & interaction teardown (from screenshots)

Observed = visible in the provided frames. Inferred = animation curve/timing not measurable from a static
image; reproduce as tasteful CAS-system equivalents (150–200 ms). CUCAS content/numbers/counselor names are
NOT reused — CAS supplies its own.

### A. Utility announcement bar (top)
Thin dark-indigo strip, two side-by-side promos each with a "Learn More" pill ("Browse Free-to-Apply
Universities", "Learn More About the CSCA Test"). → CAS already has a dismissible banner; hold 1–2 promos.

### B. Primary header (two states)
- **At page top:** white bar, full-colour logo, dark nav links.
- **Scrolled / over hero:** solid dark-navy (or transparent) bar, white logo, white links — *observed* swap
  between frames. Nav: WHY CUCAS · CHINA CSCA · UNIVERSITIES · PROGRAMS · PRICING · PARTNER · search icon ·
  a `|||` "more" trigger. Right: language (flag) · **SIGN IN** (orange solid) · notification bell (badge 6).
- Interactions: sticky condense + colour swap on scroll (observed states; curve inferred); `|||` opens the
  full mega-menu with an up-caret indicator (observed); search icon reveals a field; hover underline (inferred).

### C. Mega-menu (full-width, 5 columns) — observed
Orange column headers, hairline dividers: **DESTINATIONS** (Study in Beijing/Shanghai/Guangzhou/Nanjing/
Hangzhou/Chongqing + Check All»), **UNIVERSITIES** (6 named + Check All»), **PROGRAMS** (MBBS, Summer Camps,
Chinese Language, BBA, Non-Degree, Bachelor, Master + Check All»), **SCHOLARSHIPS** (Full, Chinese Language,
Associate, Bachelor, Master, Doctoral + Check All»), **ABOUT** (About, University Application, Accommodation
Booking, Airport Pick-up, Business Cooperation, Learning Center, Tribe, Contact Us). → CAS has 3 dropdowns;
**upgrade to a 5-column full-width mega-menu adding Destinations (cities) + About/Services.**

### D. Hero — observed (multiple states)
- Full-bleed dark hero: faded world-map/campus imagery + a giant faint watermark phrase
  ("OUR HELP TRAVELS THOUSANDS OF MILES") behind the content.
- Centre: huge "Study in China" headline + a **rotating** featured line ("Zhejiang University of Science and
  Technology: English-taught Programs" — cycles featured universities).
- **Three numbered feature cards** (orange corner ribbons 1/2/3: Beijing Foreign Studies, Nottingham,
  Tsinghua) with a `+` expand and a `×` dismiss (observed).
- **Search box** "ENTER THE NAME OF A UNIVERSITY OR A PROGRAM" + quick-filter chips (Chinese Language Program,
  MBBS, BS International Trade…). On focus → **dropdown with tabs** UNIVERSITY UPDATES / PROGRAM UPDATES /
  Latest Scholarships / NEW STORIES; scrollable rows `Name | CODE | City …… (Last Application: date)` (observed).
- **"Leave Message" panel** docked right (blue header, minimise `−`): Name, Email, Message*, **Send Message**
  (observed).
- Animations: watermark parallax + subtitle rotation + card hover-lift + search-dropdown expand + panel
  slide/minimise (curves inferred).

### E. Persistent conversion chrome — observed
- **Bottom sticky help bar:** "WE ARE HERE TO HELP:" + 3 counselor avatars (Cathy/Jayla/Joe) ·
  **Get Customized Application Plan** (calendar) · **Leave Message** (dots) · **back-to-top** (boxed arrow).
- **Floating "HELP" bubble** (orange, right edge).
- **Counselor contact card** pop: avatar + WeChat / WhatsApp/Tel / Telegram + WeChat QR (observed).
- → This is the Phase-A "Talk to a counselor" widget + sticky help bar + back-to-top. CAS uses its own
  channels (+86 number, WhatsApp) — not CUCAS's.

### F. WEEKLY PROGRAMS — observed
Section title + `?` tooltip. Large featured card: left image with **live countdown overlay**
("Expired in: DD:HH:MM:SS") + "9/n" pager; right: University · Program, MORE», a 3-fact row (Teaching
Language / Service Fee / Tuition), numbered Highlights, orange **"Apply For A Seat!"** CTA. → Deadline-urgency
carousel; CAS already computes `nextDeadline` — reuse for a live countdown spotlight.

### G. Highlights — observed
3×3 grid of editorial cards: image (some with "NEWS UPDATE" / "PARTIAL SCHOLARSHIPS" badges), italic title,
short description (scholarship/deadline/no-exam/free-application listicles). Hover lift/zoom (inferred).

### H. OUTSTANDING PROGRAMS (dark band) — observed
Navy band, row of 4–5 image cards: orange program title + university subtitle (BSc Finance — Dongbei UFE;
Law — Ningbo; MBBS — China Medical; Double Degree — Asia Europe Business School; …). Hover reveal (inferred).

### I. FEATURED CONTENT (tabbed) — observed
Tabs: LATEST TOPICS (active) · QUESTIONS · TRENDY UNIVERSITIES · MORE. Left: big editorial card ("Study in
China: the complete guide"). Right: article rows (thumb + title + date) + More». Tab fade/slide (inferred).

### J. CUCAS LIVE (video, dark band) — observed
Two large video thumbnails w/ play + captions (student stories / service explainers) + More». Hover preview /
lightbox (inferred).

### K. REVIEWS (testimonials on a world map) — observed
Left: monitor illustration with a video-call grid of student faces. Right: dotted **world map with student
avatar photos scattered by country**. Avatars fade/pop in (inferred). Distinctive "global reach" pattern —
good CAS candidate.

### L. MORE IN CHINA (image mosaic) — observed
Masonry of campus/university image tiles with name-label overlays (BFSU IBS, Northeast Forestry, Xidian,
Tsinghua, Civil Aviation University, Wuhan Sports, HK Poly UIC, Southwest…). Hover overlay/zoom → university.

### M. Footer — observed
Dark navy, columns: **About Us** (About, News, Why, Contact, Teach in China) · **Sites** (course categories) ·
**Links** (scholarship SEO links) · **STAY CONNECTED** (newsletter email capture + social icons). → align CAS
footer; add newsletter signup + SEO link columns.

### N. Pre-footer "SEARCH UNIVERSITIES AND PROGRAMS" band — observed
A final full-width search box before the footer (last-chance search/convert). CAS home already ends on a
search CTA.

### Consolidated animation / micro-interaction inventory
1. Sticky header condense + colour swap on scroll · 2. Mega-menu slide-down w/ caret + hover-intent ·
3. Hero watermark parallax + rotating featured-university subtitle · 4. Numbered hero cards: hover-lift,
`+` expand, `×` dismiss · 5. Search focus → tabbed autocomplete dropdown w/ live "last application" dates ·
6. Leave-message panel slide-in + minimise · 7. Floating HELP bubble + counselor card pop (QR) ·
8. Bottom help bar + back-to-top (appears after scroll, smooth-scroll up) · 9. Weekly live countdown +
carousel · 10. Card hover lift/shadow/image-zoom across Highlights/Outstanding/Mosaic · 11. Featured-content
tab transitions · 12. Reviews avatars fade-in on map; count-up stats where used · 13. Section reveal-on-scroll.
(States 1–9, 11 observed in frames; curves/timings inferred and reproduced tastefully.)
