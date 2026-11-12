---
title: SYNERGYX — MVP Product, Engineering & Deployment Blueprint
version: 1.0
status: Build specification
team: INFERNOS
product: SYNERGYX
last_updated: 2026-11-12
---

# SYNERGYX — MVP Product, Engineering & Deployment Blueprint

**Product:** SYNERGYX  
**Team:** INFERNOS  
**Category:** AI-powered industrial resource intelligence  
**Primary users:** Owners and managers of small and medium manufacturing businesses  
**MVP objective:** Turn monthly utility and production records into understandable resource analytics, evidence-based recommendations, tracked actions and transparent before/after comparisons.

> **Build this document as the single source of truth.** The AI coding agent must read this file before changing code. Do not invent additional screens, data, metrics, API routes or buttons without updating this specification first.

---

## 0. Important engineering promise and scope boundary

No written specification or AI coding agent can honestly guarantee that software will never break. This blueprint instead requires the agent to build in small verified stages, use database migrations, validate all inputs, test every critical flow, and deploy only after all quality gates pass.

The MVP must be **actually functional**, not a static UI mock-up. Every visible control must either perform its stated action or be clearly marked as disabled / coming later. Do not use fake dashboard numbers in a real account. Do not silently swallow API errors. Do not claim a saving, carbon reduction, machine fault or industry benchmark that the available data cannot prove.

### 0.1 MVP features that must work

1. User registration, login and logout.
2. One organisation per user account in the first MVP.
3. Business profile and production-unit settings.
4. Monthly utility records for electricity, water and fuel.
5. Monthly production records.
6. Secure bill/document upload and download; manual data entry remains available.
7. Validation and canonical unit conversion.
8. Dashboard KPIs calculated from saved database records.
9. Monthly analytics and production-normalised resource intensity.
10. Rules-based insight generation that works without an AI API key.
11. Optional LLM explanations using aggregated metrics only, with explicit organisation consent and strict output validation.
12. Recommendations with priority and clear action steps.
13. Action tracking: pending, in progress, completed.
14. Before/after comparison and transparent observed-savings estimates.
15. CSV export and printable monthly report.
16. Responsive light-theme UI, accessible controls, loading/empty/error states.
17. Automated tests, health checks, migrations and deployment instructions.

### 0.2 Explicitly out of MVP (do not fake these)

- Real-time IoT / machine sensor integrations.
- Automatic machine-level fault diagnosis.
- A verified local or national industry benchmark dataset.
- Automated regulatory ESG certification or compliance claims.
- Guaranteed carbon savings or guaranteed monetary savings.
- Multi-user invitations, role management and organisation switching.
- Payment plans, subscription billing and admin console.
- Full OCR for every scanned bill format.
- Native mobile application.

The data model should be extendable, but these features must not delay a stable MVP.

### 0.3 Truthful product language

Use these terms in the UI:

- “Observed increase/decrease” when comparing periods.
- “Potential saving” or “estimated saving” when a calculation is based on assumptions.
- “Possible inefficiency” rather than “machine fault” when no machine sensor exists.
- “Industry benchmark unavailable” until a sourced, dated and comparable dataset is configured.
- “AI-assisted explanation” when an LLM is used; “rule-based insight” when it is not.

Never label a month-over-month reduction as “verified savings caused by this action”. The UI may say “observed reduction after action completion” and must show the comparison period and assumptions.

---

# 1. Product concept and complete user journey

## 1.1 The user story

A small textile factory owner receives a larger electricity bill than last month. The owner has the bill but does not know whether the increase is due to greater production, changed operating hours, inefficient schedules, a leak, or another cause. Expensive industrial energy-management products may not fit the owner's budget or workflow.

The owner registers on SYNERGYX, enters the factory's basic details, uploads a utility bill, confirms its figures, enters monthly production, and opens the dashboard. SYNERGYX calculates resource use and resource intensity, compares available periods, flags unusual changes, explains possible areas to investigate, suggests practical operational actions, and lets the owner track those actions. In a later period, the owner compares the new figures with the earlier baseline.

## 1.2 Core product loop

**Register → Configure business → Upload / enter data → Validate → Analyse → Identify → Recommend → Act → Compare → Report**

## 1.3 Key product questions answered

1. How much electricity, water and fuel did the factory use?
2. How much did those resources cost, where cost data is available?
3. How much resource was used per unit of production?
4. Did intensity increase or decrease compared with a comparable earlier period?
5. What should the owner investigate or improve next?
6. Which suggested actions were accepted, started or completed?
7. What changed after an action, and what are the assumptions behind the estimate?

---

# 2. Locked technology architecture

Use this stack for the MVP. Do not substitute frameworks halfway through implementation without recording the reason and updating this document.

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + TypeScript + Vite | Browser application |
| Routing | React Router | Page navigation and protected routes |
| UI styling | CSS variables + CSS modules / organised global CSS | Design system and responsive styling |
| Server state | TanStack Query | API fetching, caching, invalidation |
| Forms | React Hook Form + Zod | Client-side validation |
| Charts | Recharts | Resource and trend charts |
| Icons | lucide-react | Consistent interface icons |
| Motion | Framer Motion (`framer-motion`) | Subtle page and component transitions |
| Backend | Python 3.12 + FastAPI | REST API and business logic |
| Validation | Pydantic v2 | Request/response schemas |
| ORM | SQLAlchemy 2.x synchronous API | Database access |
| Migrations | Alembic | Versioned database schema |
| Database | Supabase-hosted PostgreSQL | Persistent application data |
| File storage | Supabase Storage private bucket | Utility bill and evidence files |
| Password hashing | pwdlib with Argon2 | Secure password hashing |
| Access token | PyJWT | Short-lived bearer access token |
| Optional LLM | OpenAI Python SDK / Responses API | Explain already-computed facts in structured JSON |
| Frontend hosting | Vercel | Static Vite application |
| Backend hosting | Render Web Service | Long-running FastAPI service |
| Source control | GitHub | Version history and deployment trigger |

### 2.1 Why this architecture

- The frontend is a static Vite build and can deploy to Vercel.
- FastAPI is a separate long-running API service; it owns all secrets and business logic.
- PostgreSQL stores structured business records; Supabase Storage stores private documents.
- A server-side storage adapter prevents the browser from receiving privileged storage keys.
- Deterministic calculations keep metrics correct even when an external AI service is unavailable.

### 2.2 Architecture diagram

```mermaid
flowchart TD
    U[Factory Owner] --> FE[React + Vite Frontend]
    FE -->|HTTPS + Bearer token| API[FastAPI REST API]
    API --> AUTH[JWT Auth + Organisation Scope]
    API --> DB[(Supabase PostgreSQL)]
    API --> FS[Storage Service]
    FS --> SB[Private Supabase Storage Bucket]
    API --> CALC[Deterministic Analytics Engine]
    CALC --> RULES[Rules-based Insight Engine]
    CALC --> LLM{External AI enabled?}
    LLM -->|Yes, consented aggregates only| AI[LLM Provider Adapter]
    LLM -->|No / unavailable| RULES
    AI --> VALIDATE[Validate structured explanation]
    RULES --> OUT[Insights + Recommendations]
    VALIDATE --> OUT
    OUT --> DB
    DB --> API
    API --> FE
    FE --> VERCEL[Vercel]
    API --> RENDER[Render]
```

### 2.3 Non-negotiable architecture rules

1. Frontend must call the backend API. It must never connect directly to PostgreSQL.
2. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, JWT secret and LLM API key must exist only on the backend.
3. Never put secrets in a `VITE_` variable. Vite exposes `VITE_*` variables in the browser bundle.
4. Frontend must not calculate authoritative savings or carbon results. It can format values returned by the API.
5. All organisation-owned database queries must be scoped to the authenticated user's `organization_id`.
6. Never accept `organization_id` from a normal client request to decide data access.
7. Do not use `Base.metadata.create_all()` in production. Use Alembic migrations.
8. Do not store uploaded documents on Render's temporary filesystem in production.
9. Do not let the LLM invent or calculate numeric metrics. The backend calculates metrics; the LLM only explains approved facts.
10. No silent fallback to demo data in production.

---

# 3. Repository and project structure

Use a single Git repository with separate `frontend/` and `backend/` folders.

```text
synergyx/
├── SYNERGYX_MVP_BLUEPRINT.md
├── README.md
├── AGENTS.md
├── .gitignore
├── .editorconfig
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── vercel.json
│   └── src/
│       ├── main.tsx
│       ├── app/
│       │   ├── App.tsx
│       │   ├── router.tsx
│       │   ├── queryClient.ts
│       │   └── providers/
│       ├── assets/
│       ├── components/
│       │   ├── ui/
│       │   ├── feedback/
│       │   ├── layout/
│       │   ├── charts/
│       │   └── forms/
│       ├── features/
│       │   ├── auth/
│       │   ├── onboarding/
│       │   ├── dashboard/
│       │   ├── records/
│       │   ├── analytics/
│       │   ├── insights/
│       │   ├── recommendations/
│       │   ├── actions/
│       │   ├── reports/
│       │   └── settings/
│       ├── lib/
│       │   ├── apiClient.ts
│       │   ├── authStorage.ts
│       │   ├── formatters.ts
│       │   ├── queryKeys.ts
│       │   └── utils.ts
│       ├── hooks/
│       ├── styles/
│       │   ├── tokens.css
│       │   ├── globals.css
│       │   └── motion.css
│       ├── types/
│       └── test/
├── backend/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── alembic.ini
│   ├── .env.example
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       └── endpoints/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── dependencies.py
│   │   │   ├── errors.py
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── analytics_service.py
│   │   │   ├── recommendation_service.py
│   │   │   ├── insight_service.py
│   │   │   ├── savings_service.py
│   │   │   └── report_service.py
│   │   ├── storage/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── supabase_storage.py
│   │   ├── ai/
│   │   │   ├── base.py
│   │   │   ├── rules_provider.py
│   │   │   ├── openai_provider.py
│   │   │   └── schemas.py
│   │   └── utils/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   └── scripts/
│       └── seed_demo.py
└── docs/
    ├── API_CONTRACT.md
    └── DEPLOYMENT_CHECKLIST.md
```

The agent may add files where needed, but must keep feature code grouped by domain. Do not put the entire frontend in one `App.tsx` or the entire backend in one `main.py`.

---

# 4. UI sitemap and navigation

## 4.1 Public routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/login` | Login | Public; redirect authenticated users to dashboard |
| `/register` | Registration | Public |
| `/forgot-password` | MVP informational placeholder only if password reset is not implemented | Public; otherwise omit route and link |

## 4.2 Protected application routes

All routes below require a valid bearer token. If the token is absent or expired, redirect to `/login` and preserve the intended return path.

| Route | Page | Main purpose |
|---|---|---|
| `/app` | Redirect | Redirect to `/app/dashboard` |
| `/app/dashboard` | Overview | Main KPIs, monthly changes and latest insight |
| `/app/records` | Utility & production records | Add, edit, view and delete monthly data; manage bill documents |
| `/app/analytics` | Analytics | Resource consumption and intensity trends |
| `/app/insights` | AI / rule-based insights | Generate and review findings |
| `/app/recommendations` | Recommendations | Review and accept/dismiss practical actions |
| `/app/actions` | Action tracker | Track implementation status |
| `/app/reports` | Reports | View monthly summary, download CSV, print report |
| `/app/settings` | Business settings | Update organisation details, production unit and AI consent |

## 4.3 Sidebar

Desktop sidebar width: `248px`. Tablet/mobile sidebar becomes a slide-in drawer. The active navigation item uses a soft lavender background and a narrow violet indicator.

Navigation order:

1. Dashboard — `LayoutDashboard`
2. Records — `Database`
3. Analytics — `ChartNoAxesCombined`
4. Insights — `Sparkles`
5. Recommendations — `Lightbulb`
6. Action Tracker — `ClipboardCheck`
7. Reports — `FileBarChart`
8. Settings — `Settings`

The logo links to `/app/dashboard`. Do not include a decorative nav item that has no destination.

## 4.4 Application top bar

- Page title and optional breadcrumb.
- Selected reporting month where relevant.
- Help tooltip explaining the current metric where useful.
- User avatar with menu: `Settings`, `Log out`.
- No notification bell unless a real notification API is implemented.

---

# 5. Screen-by-screen behaviour and every MVP control

**Global interaction rule:** every button needs a real handler, loading state, disabled state where appropriate, success feedback and visible error feedback. A button that only changes its label or has `onClick={() => {}}` is a failed implementation.

## 5.1 Landing page `/`

### Content

- SYNERGYX wordmark.
- Headline: “Intelligence That Drives Industry.”
- Supporting line: “Understand resource consumption. Find opportunities. Track measurable improvement.”
- A clean product-preview illustration made from actual UI components or a clearly labelled non-data visual.
- Sections: Problem, How it works, Platform capabilities, CTA, Footer.

### Controls

| Control | Behaviour |
|---|---|
| `Get Started` | Navigate to `/register` |
| `Sign In` | Navigate to `/login` |
| `Explore Platform` | Scroll to How it works section |
| Logo | Navigate to `/` |
| Footer links | Use valid section anchors or real URLs; omit dead links |

No fabricated customer logos, testimonials, savings claims or industry statistics.

## 5.2 Registration `/register`

### Fields

- Full name: required, 2–80 characters.
- Work email: required, valid email, lower-case normalisation.
- Password: required, minimum 10 characters; reject common/very weak passwords if a safe local validator is available.
- Confirm password: must match; never send this field to the API.
- Organisation / factory name: required, 2–120 characters.
- Industry: required enum (`textile`, `food_processing`, `metal_fabrication`, `packaging`, `other`).
- State / location: required text, 2–100 characters.
- Country: default `India`; store ISO country code `IN` for MVP.
- Production unit: required enum (`kg`, `tonne`, `piece`, `litre`, `unit`, `other`).
- Consent checkbox for Terms / Privacy notice if those pages are provided. Do not invent a legal claim; add concise prototype privacy notice.

### Buttons and interactions

| Control | Behaviour |
|---|---|
| Show / hide password | Toggle password visibility; no network call |
| `Create account` | Validate form, POST `/api/v1/auth/register`, save returned access token in `sessionStorage`, invalidate auth cache, navigate to dashboard or onboarding completion |
| `Already have an account? Sign in` | Navigate to `/login` |
| Password strength helper | Local feedback only; never sends password anywhere except registration request over HTTPS |

### Success and error behaviour

- Disable submit while request is pending; show inline spinner and “Creating account…”.
- Duplicate email: show “An account with this email already exists.”
- Validation error: map API field errors to the correct field.
- Network error: show “Could not reach SYNERGYX. Check your connection and try again.”
- Never clear valid form fields on a transient network failure.

## 5.3 Login `/login`

### Fields

- Email.
- Password.
- Show / hide password.

### Controls

| Control | Behaviour |
|---|---|
| `Sign in` | POST `/api/v1/auth/login`; save token in `sessionStorage`; GET `/auth/me`; navigate to dashboard |
| `Create account` | Navigate to `/register` |
| Show / hide password | Toggle local visibility |
| `Forgot password?` | Do not show unless an actual reset flow exists. In MVP, password reset may be handled manually by the project owner; do not add a dead link. |

Use a generic invalid-credentials message; do not reveal whether an email is registered.

## 5.4 Dashboard `/app/dashboard`

### Header

- Greeting with first name.
- Month selector (defaults to latest month with records; if no records, current month).
- `Add data` button navigates to Records and opens the add-record form.
- `Generate insights` button runs the insight endpoint for the selected month.

### KPI cards

1. Electricity used (kWh).
2. Water used (m³).
3. Fuel used (L).
4. Utility spend (₹) — only sum bills where `amount_inr` exists; indicate “partial cost data” if some amount fields are missing.
5. Production — quantity + configured production unit.
6. Electricity intensity — kWh per production unit, only if production is available.

Do not display a made-up default value. When a metric has no data, show `—` and an action such as “Add electricity record”.

### Dashboard panels

- Monthly consumption chart with selected resource / resource filters.
- Resource intensity comparison panel.
- Latest insight panel (or empty state).
- Open actions count and completed actions count.
- Data coverage notice: e.g. “2 of 3 utility types have data for this month.”

### Controls

| Control | Behaviour |
|---|---|
| Month selector | Update query parameter/state; refetch dashboard summary |
| Resource chart filter | Change displayed series only; do not change server data |
| `Add data` | Navigate to `/app/records?mode=add` |
| `Generate insights` | POST `/insights/generate?month=YYYY-MM`; invalidate insights/dashboard queries; show progress |
| `View all insights` | Navigate to `/app/insights` |
| `View actions` | Navigate to `/app/actions` |
| KPI `View details` links | Navigate to Analytics with resource/month query parameters |

### Empty state

If no records exist, display a guided setup panel with `Add first utility record` and `Add production record`. Do not display sample metrics.

## 5.5 Records `/app/records`

Use tabs or segmented navigation:

- Utility records
- Production records
- Documents

### Utility record form

Fields:

- Resource type: electricity / water / fuel.
- Month: calendar month, stored as first day of month.
- Quantity: positive decimal.
- Unit: fixed/filtered by resource type; electricity `kWh`, water `L` or `m³`, fuel `L`.
- Bill amount in INR: optional non-negative decimal.
- Evidence document: optional selected uploaded document.
- Notes: optional, max 500 characters.

The backend stores canonical units only: electricity `kWh`, water `m³`, fuel `L`.

Conversions:

- Water litres → cubic metres: `litres / 1000`.
- Water cubic metres → cubic metres: unchanged.
- Electricity kWh → kWh: unchanged.
- Fuel litres → litres: unchanged.

### Utility form controls

| Control | Behaviour |
|---|---|
| Resource dropdown | Select resource type; update allowed unit options |
| Month picker | Select one calendar month; reject future month only if business policy requires it; otherwise allow corrections |
| Quantity input | Numeric input; client validation plus server validation |
| Unit dropdown | Select allowed unit for selected resource |
| Amount input | Optional INR amount; allow 0 only if the bill truly has no payable amount; otherwise non-negative |
| `Upload bill` | Open file picker; accept PDF/JPG/JPEG/PNG up to 10 MB; POST multipart `/documents`; show real upload progress through a dedicated `XMLHttpRequest` upload helper (the normal JSON API client may use `fetch`); link returned `document_id` to the record |
| `Save record` | POST `/utility-records` for create or PATCH `/utility-records/{id}` for edit; show success; refresh records/dashboard/analytics |
| `Cancel` | Close form and discard unsaved changes after confirmation if dirty |
| `Edit` row action | Open populated form |
| `View document` | Request short-lived download URL from backend; open in new tab after server authorisation |
| `Delete` row action | Confirm destructive action; DELETE record; refresh relevant queries; document remains unless separately deleted and unreferenced |
| `Clear filters` | Reset filters to defaults |

**MVP data rule:** one utility record per organisation + resource type + month. If the user has multiple meters/bills of the same resource in the same month, the UI must explain that this first version expects one combined monthly total. Do not create duplicate rows silently.

### Production record form

Fields:

- Month.
- Production quantity.
- Production unit (inherited from organisation setting and displayed as read-only here).
- Optional notes.

Controls:

| Control | Behaviour |
|---|---|
| `Add production` | Open create form |
| `Save production` | POST `/production-records` or PATCH existing month record |
| `Edit` | Load existing month quantity and notes |
| `Delete` | Confirm and DELETE production record; warn that intensity calculations for that month may disappear |
| `Cancel` | Close form; confirm if unsaved changes exist |

One production record per organisation per month. Production unit must match organisation settings.

### Documents tab

Columns: file name, uploaded date, file type, file size, linked record (if any), actions.

Controls:

| Control | Behaviour |
|---|---|
| `Upload document` | Same secure upload flow as above |
| `Preview / Download` | Backend authorises organisation ownership and returns a signed URL / streamed local file |
| `Delete` | Allowed only when no utility record is linked; otherwise ask user to unlink first |
| `Refresh` | Refetch documents query |

**MVP OCR policy:** upload and secure storage are required. Automatic OCR is not required for the first deploy. The owner manually enters and confirms bill figures. The storage/document service must be designed so OCR can be added later without changing the utility-record contract. Never show extracted values unless an extraction service actually ran.

## 5.6 Analytics `/app/analytics`

### Filters

- Start month.
- End month.
- Resource selector: all / electricity / water / fuel.
- View selector: total consumption / intensity / expenditure.

### Visuals

- Line chart: monthly consumption by resource.
- Line chart or bar chart: intensity by resource.
- Bar chart: utility spend (only where amount exists).
- Summary table with month, production, resource quantity, intensity, amount.

### Controls

| Control | Behaviour |
|---|---|
| Start / end month | Validate start <= end; refetch analytics |
| Resource selector | Refetch or filter returned series |
| Metric selector | Change chart metric |
| `Export CSV` | GET `/reports/analytics.csv?...`; download file with safe name |
| `Reset filters` | Return to default available range |
| Chart legend item | Toggle series visibility |

If the selected range has gaps, preserve gaps; do not interpolate or invent missing data. If production is missing, intensity for that month is `null` and chart must show a gap.

## 5.7 Insights `/app/insights`

### Insight card fields

- Generated date.
- Month analysed.
- Resource category.
- Severity (low / medium / high).
- Title.
- Observed metric and comparison.
- Explanation.
- Data coverage / caveat.
- Source: rule-based or AI-assisted.

### Controls

| Control | Behaviour |
|---|---|
| Month filter | Refetch insights for selected month |
| Severity filter | Filter cards |
| `Generate insights` | POST `/insights/generate?month=YYYY-MM` |
| `View recommendation` | Navigate to linked recommendation |
| `Dismiss insight` | Optional MVP action: mark dismissed with PATCH; if not implemented, omit this control |
| `Refresh` | Refetch saved insights; not regenerate |

Do not generate insights from a month without enough data. Return a clear “Add utility and production data” response. Avoid duplicate insights: upsert by organisation + month + metric code + engine version or explicitly replace previous generated set in a transaction.

## 5.8 Recommendations `/app/recommendations`

Each recommendation card must show:

- What was observed.
- Why it matters.
- A practical action.
- Ordered implementation steps.
- Priority.
- Expected benefit / estimated saving only when calculable.
- Assumptions and limitations.
- Linked insight.

Controls:

| Control | Behaviour |
|---|---|
| `Accept recommendation` | POST `/recommendations/{id}/accept`; create one linked action in a transaction; change recommendation status to accepted |
| `Dismiss` | POST `/recommendations/{id}/dismiss`; store status and optional reason |
| `View action` | Navigate to linked action detail / action tracker |
| Priority filter | Filter existing records |
| Status filter | Filter proposed / accepted / dismissed / completed |

The accept endpoint must be idempotent: clicking twice must not create duplicate actions. Disable the button while the request is pending.

## 5.9 Action tracker `/app/actions`

Statuses: `pending`, `in_progress`, `completed`, `cancelled`.

Action fields:

- Title.
- Description.
- Linked recommendation (optional).
- Status.
- Due date (optional).
- Completed date (server-set when moving to completed).
- Notes.

Controls:

| Control | Behaviour |
|---|---|
| `Add action` | Open manual action form |
| `Save action` | POST `/actions` |
| `Edit` | Open populated edit form |
| `Mark in progress` | PATCH `/actions/{id}` status `in_progress` |
| `Mark completed` | PATCH status `completed`; server sets `completed_at` |
| `Reopen` | PATCH status `in_progress`; clear completed_at only if policy says reopening invalidates completion |
| `Delete` | Confirm and DELETE action; keep recommendation record intact |
| Status filter | Filter actions |
| Due-date filter | Filter upcoming / overdue actions |

When an action is completed, do not claim that savings have been achieved. Wait for a later comparable utility + production period and calculate observed changes.

## 5.10 Reports `/app/reports`

- Month selector.
- Report summary: utility totals, production, intensities, spend coverage, insights, recommendations and action status.
- Data-quality notes and comparison limitations.

Controls:

| Control | Behaviour |
|---|---|
| `Generate report` | GET `/reports/monthly?month=YYYY-MM`; API returns report data from saved records |
| `Download CSV` | Download monthly summary CSV |
| `Print / Save PDF` | Call browser print on a print-specific report layout; PDF creation is performed by the browser, not a fake server endpoint |
| `Back to dashboard` | Navigate to dashboard |

Report must include generated timestamp, organisation name, selected month, units, missing-data notes and comparison basis. Avoid saying “certified ESG report”.

## 5.11 Settings `/app/settings`

Sections:

1. Business profile: name, industry, location, country.
2. Production settings: canonical production unit.
3. AI privacy: opt-in toggle for external LLM explanations using aggregated data only.
4. Account: name/email (email change may be excluded from MVP), password change may be excluded from MVP.

Controls:

| Control | Behaviour |
|---|---|
| `Save business profile` | PATCH `/organization` |
| Production unit dropdown | Select unit; warn that historical records remain in their stored unit and cannot be silently reinterpreted |
| `Save production settings` | PATCH `/organization` |
| External AI consent toggle | PATCH `/organization/ai-consent`; default `false`; explain what aggregated values may be sent |
| `Log out` | Clear sessionStorage, clear query cache and navigate to `/login` |

If a user changes production unit after entering data, do not convert old quantities automatically. Require a deliberate migration/confirmation flow or block the change once production data exists. For MVP, simplest safe behaviour: production unit is locked after the first production record; show support guidance instead of silently changing it.

---

# 6. Premium lavender-light design system

The interface should feel like a premium enterprise SaaS product. Use a light base, restrained lavender accents, clear data hierarchy and glass only where it improves the interface.

## 6.1 Exact design tokens

```css
:root {
  /* Brand */
  --brand-primary: #8D79C8;
  --brand-primary-hover: #7965B5;
  --brand-secondary: #B4A5DF;
  --brand-deep: #29243B;
  --brand-soft: #EAE5F5;

  /* Surfaces */
  --bg-main: #F6F4FB;
  --bg-card: #FFFFFF;
  --bg-secondary: #F0EDF7;
  --bg-sidebar: #FFFFFF;
  --bg-input: #FFFFFF;

  /* Text */
  --text-primary: #29243B;
  --text-secondary: #625B73;
  --text-muted: #817A95;
  --text-disabled: #AAA4B7;
  --text-inverse: #FFFFFF;

  /* Borders */
  --border-default: #E5E0EF;
  --border-hover: #C8BCE1;
  --border-focus: #8D79C8;

  /* Status */
  --success: #438D70;
  --success-bg: #EAF4EF;
  --warning: #D39B48;
  --warning-bg: #FBF3E6;
  --danger: #D46F76;
  --danger-bg: #FBEDEE;
  --info: #718BC6;
  --info-bg: #EDF1FA;

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.85);
  --glass-blur: 16px;

  /* Gradients */
  --gradient-brand: linear-gradient(135deg, #8D79C8, #B4A5DF);
  --gradient-hero: linear-gradient(135deg, #F6F4FB, #EAE5F5, #F4F1FA);
  --gradient-ai: linear-gradient(135deg, #F0EDF7, #E7E0F4);

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(41, 36, 59, 0.04);
  --shadow-card: 0 8px 30px rgba(51, 38, 83, 0.06);
  --shadow-hover: 0 14px 35px rgba(51, 38, 83, 0.10);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-full: 999px;

  /* Spacing: use 4px base scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Typography */
  --font-heading: 'Manrope', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 350ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 6.2 Typography

Use Manrope for headings and Inter for body/UI. Load fonts via Google Fonts or self-host them; the app must remain readable if the font request fails.

| Element | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Marketing hero | 56–64px | 36–42px | 700–800 |
| Page heading | 30–34px | 26–30px | 700 |
| Section heading | 22–24px | 20–22px | 600–700 |
| Card title | 16–18px | 16px | 600 |
| Body | 14–16px | 14–16px | 400 |
| Label | 12–13px | 12px | 500–600 |
| KPI value | 30–36px | 26–30px | 700 |

Use tabular numerals for KPIs, tables and chart labels.

## 6.3 Layout dimensions

- Desktop sidebar: `248px`.
- Top bar: `72px`.
- Main content maximum width: `1440px`.
- Main content padding: `32px` desktop, `20px` tablet, `16px` mobile.
- Card padding: `20–24px`.
- Card radius: `18px`.
- Modal radius: `20px`.
- Form input height: `44–48px`.
- Minimum touch target: `44px`.

## 6.4 Glassmorphism rules

Use glass selectively for the top navigation, hero preview, floating overlays and AI insight highlight. Do not put all tables/forms behind blur.

```css
.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.premium-card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-normal) var(--ease-standard),
              box-shadow var(--duration-normal) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .premium-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 6.5 Chart palette

Use a restrained and consistent palette. Do not assign random colours per render.

- Electricity: `#8D79C8`.
- Water: `#718BC6`.
- Fuel: `#D39B48`.
- Production: `#438D70`.
- Grid / neutral: `#E5E0EF`.
- Labels: `#817A95`.

Always display a legend and units. Do not use colour alone to communicate status.

---

# 7. Animation and interaction specification

Motion should make the application feel polished, not distract from business data. Use Framer Motion for composed transitions and CSS transitions for small hover/focus states.

| Interaction | Animation | Timing | Notes |
|---|---|---:|---|
| Route page enter | opacity 0 → 1, y 8px → 0 | 220ms | Do not animate full page on every tiny query refetch |
| Sidebar active item | background and indicator fade/slide | 180ms | Keep active state clear without animation dependency |
| Card hover | translateY(-2px), soft shadow | 220ms | Desktop pointer only |
| Button hover | small colour/brightness transition | 150ms | No large scaling |
| Button press | scale 0.98 | 100ms | Avoid on keyboard focus |
| Modal open | opacity 0 → 1, scale 0.98 → 1 | 180ms | Focus trap and Escape support required |
| Drawer open | x from -16px to 0 | 220ms | Mobile sidebar |
| Toast enter | opacity 0 → 1, y 8px → 0 | 180ms | Auto-dismiss success only; error stays longer |
| Skeleton | subtle static/pulse shimmer | 1.4s loop | Stop under reduced motion |
| Chart mount | gentle line/bar reveal | 350–600ms | Do not animate every polling/refetch update |
| Upload progress | progress bar width | native progress | Must reflect actual upload progress where available |
| Accordion | height + opacity | 180ms | Keep content accessible |

### Motion implementation rules

1. Respect `prefers-reduced-motion: reduce` globally.
2. Do not animate important numeric values in a way that makes the value difficult to read.
3. Do not make loading depend on animation completion.
4. Do not animate layout in a way that causes content to jump or controls to move under the pointer.
5. Modal and drawer must support keyboard navigation, Escape to close, focus management and accessible labels.
6. Loading buttons must keep a stable width to prevent layout shift.
7. Use one consistent motion configuration in `src/lib/motion.ts` or equivalent; do not copy random durations across components.

---

# 8. Data model and database rules

Use UUID primary keys. Use PostgreSQL `NUMERIC` for all measured quantities and money; do not use floating point for saved financial/resource values. Use timezone-aware timestamps for audit fields. Store all dates/times in UTC; reporting periods are calendar months and are represented by the first day of the month (`DATE`). Currency is INR for the first MVP.

## 8.1 Tables

### `organizations`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(120) | required |
| `industry` | VARCHAR(40) | enum validated by backend |
| `location` | VARCHAR(100) | required |
| `country_code` | CHAR(2) | default `IN` |
| `production_unit` | VARCHAR(20) | enum validated by backend |
| `allow_external_ai` | BOOLEAN | default false |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

### `users`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK → organizations.id, indexed, not null |
| `full_name` | VARCHAR(80) | required |
| `email` | CITEXT or normalized VARCHAR | unique, lower-case |
| `password_hash` | TEXT | Argon2 hash only; never store plaintext |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

MVP assumption: one user creates and owns one organisation. Do not build team invitations yet. All data tables include `organization_id`, so membership can be introduced later.

### `utility_records`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed, not null |
| `resource_type` | VARCHAR(20) | `electricity`, `water`, `fuel` |
| `period_month` | DATE | first day of month only |
| `quantity` | NUMERIC(14,3) | canonical unit, > 0 |
| `unit` | VARCHAR(10) | `kWh`, `m3`, `L` based on type |
| `amount_inr` | NUMERIC(14,2) | nullable, >= 0 |
| `document_id` | UUID | nullable FK → documents.id; unique when non-null so one document links to at most one record |
| `notes` | VARCHAR(500) | nullable |
| `created_by` | UUID | FK → users.id |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

Constraints:

- Unique (`organization_id`, `resource_type`, `period_month`).
- `period_month` must be the first day of a calendar month.
- Resource type and unit must match the canonical mapping.
- Reject duplicate records with HTTP 409 and explain that the existing month/resource record should be edited.

### `production_records`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed, not null |
| `period_month` | DATE | first day of month |
| `quantity` | NUMERIC(14,3) | > 0 |
| `unit` | VARCHAR(20) | must equal organisation production unit |
| `notes` | VARCHAR(500) | nullable |
| `created_by` | UUID | FK → users.id |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

Unique (`organization_id`, `period_month`).

### `documents`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed, not null |
| `storage_provider` | VARCHAR(20) | `local` or `supabase` |
| `storage_path` | TEXT | private object key; never public URL |
| `original_filename` | VARCHAR(255) | sanitised display name |
| `mime_type` | VARCHAR(100) | allowlisted PDF/JPEG/PNG |
| `size_bytes` | BIGINT | max 10 MB |
| `uploaded_by` | UUID | FK → users.id |
| `created_at` | TIMESTAMPTZ | server-generated |

A document may be linked to at most one utility record in MVP. Ensure deletion rules are explicit. Do not store document bytes in PostgreSQL.

### `insights`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed |
| `period_month` | DATE | first day of month |
| `metric_code` | VARCHAR(60) | stable code, e.g. `electricity_intensity_mom` |
| `resource_type` | VARCHAR(20) | nullable |
| `severity` | VARCHAR(10) | low / medium / high |
| `title` | VARCHAR(180) | required |
| `summary` | TEXT | required |
| `observed_value` | NUMERIC(18,6) | nullable |
| `comparison_value` | NUMERIC(18,6) | nullable |
| `change_percent` | NUMERIC(10,3) | nullable |
| `unit` | VARCHAR(30) | nullable |
| `source_type` | VARCHAR(20) | `rules` or `ai_assisted` |
| `caveat` | TEXT | required when comparison is weak |
| `engine_version` | VARCHAR(30) | required |
| `created_at` | TIMESTAMPTZ | server-generated |

Prevent duplicate metric cards for the same month and engine version, or replace generated insights in a single transaction.

### `recommendations`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed |
| `insight_id` | UUID | nullable FK → insights.id |
| `title` | VARCHAR(180) | required |
| `description` | TEXT | required |
| `steps_json` | JSONB | array of short steps |
| `priority` | VARCHAR(10) | low / medium / high |
| `status` | VARCHAR(20) | proposed / accepted / dismissed / completed |
| `estimated_saving_quantity` | NUMERIC(18,3) | nullable |
| `estimated_saving_unit` | VARCHAR(20) | nullable |
| `estimated_saving_inr` | NUMERIC(14,2) | nullable |
| `assumptions` | TEXT | required if estimate exists |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

### `actions`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID | FK, indexed |
| `recommendation_id` | UUID | nullable FK → recommendations.id |
| `title` | VARCHAR(180) | required |
| `description` | TEXT | nullable |
| `status` | VARCHAR(20) | pending / in_progress / completed / cancelled |
| `due_date` | DATE | nullable |
| `completed_at` | TIMESTAMPTZ | nullable; server-set |
| `notes` | VARCHAR(1000) | nullable |
| `created_by` | UUID | FK → users.id |
| `created_at` | TIMESTAMPTZ | server-generated |
| `updated_at` | TIMESTAMPTZ | server-generated |

### `ai_generation_logs` (recommended minimal audit table)

Store generation timestamp, organisation ID, provider (`rules` / `openai`), month, success/fallback status, error category (not raw prompt or bill text), and engine version. Do not store secrets, access tokens, raw invoices or unnecessary personal information.

## 8.2 Indexes

At minimum:

- `users.email` unique.
- Every organisation-owned table: index on `organization_id`.
- `utility_records(organization_id, period_month)`.
- `production_records(organization_id, period_month)` unique.
- `utility_records.document_id` unique where non-null, preventing one file from being linked to multiple monthly records.
- `insights(organization_id, period_month)`.
- `recommendations(organization_id, status)`.
- `actions(organization_id, status, due_date)`.
- `documents(organization_id, created_at)`.

## 8.3 Data access isolation

Create one dependency, e.g. `get_current_user()`, that validates the bearer token and loads the active user. Every service/query must receive the authenticated user or organisation ID from that dependency. Use organisation-scoped query helpers. A record ID alone is never sufficient authorisation.

For all `GET`, `PATCH`, `DELETE`, signed-download and relationship operations, filter by both record ID and `current_user.organization_id`. Return 404 for records outside the user's organisation so IDs cannot be enumerated.

---

# 9. Units, calculations and analytics specification

All numerical calculations happen on the backend using `Decimal`. Round only for display/response formatting; retain adequate precision in stored/calculated values.

## 9.1 Canonical resource units

| Resource | Input units | Stored unit | Canonical quantity |
|---|---|---|---|
| Electricity | kWh | kWh | unchanged |
| Water | L or m³ | m³ | L ÷ 1000, or unchanged |
| Fuel | L | L | unchanged |

Do not mix kg, litres, kWh and m³. Each chart and KPI must print the unit.

## 9.2 Production intensity

Only calculate intensity when the matching month's production quantity exists and is greater than zero.

`resource_intensity = resource_quantity / production_quantity`

Examples:

- Electricity: `kWh per kg fabric`.
- Water: `m³ per kg fabric`.
- Fuel: `L per kg fabric`.

The UI label must include the configured production unit, e.g. `kWh/kg`. For production measured in pieces, use `kWh/piece`.

## 9.3 Month-over-month change

Only compare the selected month with the immediately previous calendar month when both months have valid records for the same resource and production unit.

`change_percent = ((current_value - previous_value) / previous_value) × 100`

If previous value is zero, return `null` with caveat “percentage change cannot be calculated from a zero baseline”. If previous month is missing, return `null` with caveat “previous month data unavailable”. Do not compare against a distant month and label it month-over-month.

## 9.4 Observed improvement / potential savings

Where intensity is lower than the previous comparable month:

`observed_reduction_per_unit = previous_intensity - current_intensity`

`observed_resource_reduction = observed_reduction_per_unit × current_month_production`

If this result is positive, label it **observed resource reduction vs previous month**, not confirmed causal savings.

Potential monetary estimate, only when prior unit cost can be calculated:

`previous_unit_cost = previous_amount_inr / previous_resource_quantity`

`potential_saving_inr = observed_resource_reduction × previous_unit_cost`

Show the assumptions and do not calculate if bill amount or prior quantity is absent. Exclude fixed charges if they cannot be separated; state this limitation.

## 9.5 Spend

`monthly_spend_inr = sum(amount_inr for utility records where amount_inr is not null)`

If one or more resource bill amounts are missing, return `cost_data_coverage` (e.g. 2 of 3 resources) and label the sum partial. Do not treat missing cost as zero without a coverage note.

## 9.6 Carbon / emissions

Do not hardcode an unverified emission factor. Carbon estimate is hidden until a dated, sourced factor is configured.

If implemented later:

`estimated_kg_co2e = electricity_kwh × configured_emission_factor_kg_co2e_per_kwh`

Store factor value, source title/URL, geography, effective year and configuration date. Label output “estimated” and show source. Fuel-specific factors require separate verified factors.

## 9.7 Benchmarking

The MVP compares the factory with its own previous comparable periods. Do not display “local industry average” or “national benchmark” unless a real, dated, sector-specific, geographically relevant dataset has been reviewed and included. A placeholder or fabricated comparison is prohibited.

## 9.8 Missing data behaviour

- No utility record: show `—`, not `0`.
- No production: show consumption but intensity is unavailable.
- No previous month: show current value and “comparison unavailable”.
- Incomplete bill amount: show partial cost coverage.
- No carbon factor: hide emissions metric or show “factor not configured”.
- No data: empty-state CTA, not demo numbers.

---

# 10. Rules-based insight and AI engine

The AI layer must never own arithmetic. The backend calculation service creates a trusted facts object; rules produce findings; an optional LLM turns those facts into clearer language.

## 10.1 Insight pipeline

1. Load selected month and previous comparable month for the authenticated organisation.
2. Validate data coverage and production consistency.
3. Calculate consumption, intensity, spend and month-over-month deltas.
4. Run deterministic rules.
5. Create insight records and recommendation candidates.
6. If external AI is enabled by the organisation and an API key is configured, send only approved aggregated metrics and non-sensitive industry category to the LLM provider.
7. Validate the structured response against a Pydantic schema.
8. If provider fails, times out, refuses or returns invalid output, fall back to deterministic text.
9. Save insights with `source_type` and `engine_version`.

## 10.2 Starter rules

Rules are initial heuristics, not scientific diagnosis. Keep thresholds in a single config module so they can be tuned.

| Rule code | Condition | Output |
|---|---|---|
| `electricity_intensity_up` | Electricity kWh/production rises by 10% or more vs previous month | Flag increase; suggest checking idle time, schedule and equipment runtime where applicable |
| `water_intensity_up` | Water m³/production rises by 10% or more | Suggest checking leaks, cleaning cycles and water-intensive steps where applicable |
| `fuel_intensity_up` | Fuel L/production rises by 10% or more | Suggest reviewing operating hours, generator/boiler use and maintenance records where applicable |
| `electricity_intensity_down` | Electricity intensity falls by 5% or more | Show observed improvement; do not claim a particular action caused it |
| `missing_production_data` | Utility exists but production missing | Explain why intensity cannot be calculated; recommend entering production |
| `missing_cost_data` | Quantity exists but amount missing | Explain partial cost reporting |

If fewer than two comparable periods exist, do not create increase/decrease rules. Instead show a data-readiness insight: add at least one earlier month for trend comparison.

A 10% threshold is a prototype default, not an industry standard. Add a code comment and UI caveat that thresholds are configurable.

## 10.3 Recommendation templates

Examples must be qualified with “where applicable” because SYNERGYX does not know the factory's exact machines or process yet.

- Electricity: “Review machine idle time and operating schedules. Record which equipment remains on during non-production periods.”
- Water: “Inspect visible leaks and review cleaning / rinsing cycles. Record water use before and after the change.”
- Fuel: “Review generator or boiler runtime, operating schedules and maintenance logs.”
- Missing production data: “Add the production quantity for this month so resource intensity can be calculated.”

Do not say a specific machine is faulty unless machine-level data is available and independently supports the finding.

## 10.4 LLM provider contract

Interface:

```python
class ExplanationProvider(Protocol):
    def explain_insights(self, facts: InsightFacts) -> InsightExplanation: ...
```

`InsightFacts` must contain only:

- industry enum (not factory name),
- period month,
- resource type,
- calculated quantity and canonical unit,
- production quantity and unit if available,
- calculated intensity,
- comparison value and percentage if available,
- data quality caveats,
- allowed recommendation categories.

Do not send email, person name, exact location, bill file, invoice number, account number, raw OCR text or document contents to the LLM.

Expected structured response:

```json
{
  "summary": "string, max 500 chars",
  "possible_causes": ["string, max 180 chars each"],
  "next_steps": ["string, max 180 chars each"],
  "caveat": "string, max 300 chars"
}
```

The schema must reject extra keys and enforce lengths. The LLM cannot return the final numeric values used by KPI cards. Use backend-calculated numbers only.

Use the OpenAI Responses API and Structured Outputs if the OpenAI provider is selected. Keep `OPENAI_MODEL` configurable; do not hardcode a model name that may not be enabled for the account. Add timeout, limited retry, error classification and deterministic fallback. Use a modest token limit. Never expose provider errors or prompt details to end users.

## 10.5 AI consent and fallback

- `allow_external_ai` defaults to `false`.
- Explain in Settings that only aggregated, non-identifying metrics are sent to the configured external AI provider when consent is on.
- If consent is off or no key is configured, use `rules_provider` only.
- Do not block dashboard, analytics, recommendations or reports if OpenAI is down.
- Log provider status without logging sensitive payloads.

---

# 11. Backend API contract

Base URL: `/api/v1`. All JSON request bodies use `Content-Type: application/json` unless the route specifies multipart. Protected routes require `Authorization: Bearer <access_token>`.

## 11.1 Standard response and errors

Successful endpoints return JSON with predictable field names. Use Pydantic response schemas. Dates use ISO 8601 (`YYYY-MM-DD` or UTC timestamps); decimals are serialised as JSON numbers or decimal strings consistently (choose one format and document it; recommended: decimal strings for exact values, frontend formats them safely).

Error body:

```json
{
  "detail": "Human-readable safe message",
  "code": "STABLE_MACHINE_CODE",
  "request_id": "uuid"
}
```

Do not return stack traces, SQL messages, secrets or raw provider responses. Validation errors may include safe field details.

## 11.2 Health endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health/live` | No | Process is running; no DB query |
| GET | `/health/ready` | No | DB connectivity and required config are available |

Return 200 on success, 503 on not ready. Do not expose database host/password in response.

## 11.3 Authentication

| Method | Path | Body / Query | Result |
|---|---|---|---|
| POST | `/auth/register` | name, email, password, organisation fields, industry, location, production_unit | Creates organisation + user in one DB transaction; returns access token and user/profile |
| POST | `/auth/login` | email, password | Returns access token and user/profile |
| GET | `/auth/me` | None | Returns current user + organisation summary |

JWT:

- Algorithm fixed in backend config (e.g. HS256); never accept algorithm from token header.
- Unique random secret in production, minimum 32 random bytes.
- Expiry 30 minutes for MVP.
- Claims: `sub` user UUID, `iat`, `exp`, `iss`, `aud`.
- Validate issuer and audience.
- Do not put password, email or private data in JWT claims.
- Frontend stores access token in `sessionStorage` only for MVP and clears it on logout/expiry. Do not use `localStorage`.
- On expiry, return to login. Refresh-token rotation is a later hardening feature.

Use Argon2 password hashing via `pwdlib[argon2]`. Never log passwords. Registration must prevent duplicate normalised email.

## 11.4 Organisation

| Method | Path | Purpose |
|---|---|---|
| GET | `/organization` | Read current organisation |
| PATCH | `/organization` | Update allowed business profile fields |
| PATCH | `/organization/ai-consent` | Update `allow_external_ai` |

Never let a user update `id`, owner user ID or another organisation's settings.

## 11.5 Documents

| Method | Path | Purpose |
|---|---|---|
| POST | `/documents` | Multipart upload; validates type/size/signature, stores private file, saves metadata |
| GET | `/documents` | List current organisation's files |
| GET | `/documents/{document_id}/download` | Generate short-lived signed URL or stream local file after access check |
| DELETE | `/documents/{document_id}` | Delete only if not linked to a utility record; remove object and DB row safely |

Upload requirements:

- Maximum 10 MB.
- Allow only PDF, JPEG, PNG.
- Validate extension AND MIME AND file signature/magic bytes; do not trust browser-provided MIME alone.
- Generate a UUID-based storage object key. Never use raw filename as path.
- Store bucket privately.
- Create a signed download URL for 60–300 seconds only after checking ownership.
- Never include `SUPABASE_SERVICE_ROLE_KEY` in a URL or frontend response.
- Ensure storage upload failure does not create an orphan DB record; if DB insert fails after upload, attempt object cleanup.

## 11.6 Utility records

| Method | Path | Purpose |
|---|---|---|
| GET | `/utility-records?month=&resource_type=` | List records, optionally filtered |
| POST | `/utility-records` | Create one resource record for a month |
| GET | `/utility-records/{id}` | Read one scoped record |
| PATCH | `/utility-records/{id}` | Update allowed fields |
| DELETE | `/utility-records/{id}` | Delete scoped record; do not silently delete attached document |

POST/PATCH schema fields: `resource_type`, `period_month`, `quantity`, `input_unit`, `amount_inr`, `document_id`, `notes`.

Backend converts `input_unit` to canonical unit and stores canonical `quantity` + `unit`. Validate that document belongs to current organisation.

## 11.7 Production records

| Method | Path | Purpose |
|---|---|---|
| GET | `/production-records?month=` | List production data |
| POST | `/production-records` | Create monthly production quantity |
| PATCH | `/production-records/{id}` | Update monthly quantity |
| DELETE | `/production-records/{id}` | Delete record |

The API enforces production unit == organisation production unit.

## 11.8 Dashboard and analytics

| Method | Path | Query | Purpose |
|---|---|---|---|
| GET | `/dashboard/summary` | `month=YYYY-MM` | KPIs, coverage, latest insight/action counts |
| GET | `/analytics` | `from=YYYY-MM&to=YYYY-MM&resource_type=all|...&metric=consumption|intensity|spend` | Monthly data series and table rows |

API must return null for unavailable metrics, plus `data_quality` / `caveats`. Do not return fake zeros.

## 11.9 Insights and recommendations

| Method | Path | Purpose |
|---|---|---|
| GET | `/insights?month=` | List saved insights |
| POST | `/insights/generate?month=` | Recalculate and upsert insights/recommendations for selected month |
| GET | `/recommendations?status=&priority=` | List recommendations |
| POST | `/recommendations/{id}/accept` | Accept and atomically create linked action; idempotent |
| POST | `/recommendations/{id}/dismiss` | Dismiss recommendation |

Generating insights must be transaction-safe. Avoid duplicate actions when accepting a recommendation multiple times.

## 11.10 Actions

| Method | Path | Purpose |
|---|---|---|
| GET | `/actions?status=&from=&to=` | List actions |
| POST | `/actions` | Create manual action |
| PATCH | `/actions/{id}` | Update title, description, status, due date, notes |
| DELETE | `/actions/{id}` | Delete action |

Only the backend sets `completed_at`. Validate status transitions.

## 11.11 Reports

| Method | Path | Purpose |
|---|---|---|
| GET | `/reports/monthly?month=YYYY-MM` | JSON report summary |
| GET | `/reports/monthly.csv?month=YYYY-MM` | CSV download |
| GET | `/reports/analytics.csv?from=&to=&resource_type=&metric=` | CSV export for analytics |

CSV output must escape commas, quotes and newlines correctly. Use a safe filename. Prevent spreadsheet formula injection by prefixing dangerous leading characters (`=`, `+`, `-`, `@`, tab, carriage return) in user-controlled text cells.

## 11.12 API documentation

FastAPI OpenAPI docs may be available at `/docs` in local/staging. In production, either disable public docs or protect/limit them if the demo does not need them. Never place secrets in endpoint descriptions or examples.

---

# 12. Frontend implementation standards

## 12.1 API client

Create one typed API client. Requirements:

- Base URL from `VITE_API_BASE_URL`.
- Add `Authorization: Bearer <token>` only when token exists.
- Set JSON headers for JSON calls; do not set multipart content type manually (browser must add boundary).
- Parse error responses safely; throw a typed `ApiError` with status, code and message.
- On 401, clear token/query cache and redirect to login once; prevent redirect loops.
- Never retry non-idempotent POST requests automatically unless an idempotency key is implemented.
- Use `AbortSignal` where possible to cancel stale requests.

## 12.2 Server-state queries

- Use TanStack Query for all remote data.
- Define central query keys in `queryKeys.ts`.
- On successful record create/update/delete, invalidate dashboard, records, analytics, insights and reports as relevant.
- Use optimistic updates only for simple status changes when rollback is implemented; otherwise refetch after success.
- Avoid putting server records in multiple unrelated React state stores.

## 12.3 Forms

- Use React Hook Form + Zod.
- Client validation improves UX; backend validation remains authoritative.
- Display field-level errors from backend.
- Preserve user input when server validation fails.
- Disable submit only for the form currently saving.
- Prevent double submit.

## 12.4 Reusable UI components

Build and reuse:

- `AppShell`, `Sidebar`, `MobileDrawer`, `Topbar`, `PageHeader`.
- `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `DateMonthPicker`, `Checkbox`, `Switch`.
- `Card`, `GlassPanel`, `KpiCard`, `StatusBadge`.
- `DataTable`, `EmptyState`, `ErrorState`, `LoadingSkeleton`.
- `Modal`, `ConfirmDialog`, `DropdownMenu`, `Toast`.
- `ChartCard`, `ChartTooltip`, `ChartLegend`.
- `FileUploadDropzone`, `FileAttachmentRow`, `ProgressBar`.

Each component needs accessible label/description support, visible keyboard focus and disabled/loading variants.

## 12.5 Error boundaries

Add a top-level React error boundary. Show a friendly fallback page and a `Reload` button. Do not expose stack traces to users. Report enough context to console in development; do not log tokens or sensitive form values.

## 12.6 Currency and number formatting

- Currency: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 or 2 as appropriate })`.
- Quantity: preserve sensible decimals and append the unit.
- Never display a raw number without a unit when the metric is a resource quantity or intensity.
- Use locale formatting consistently.

---

# 13. Backend implementation standards

## 13.1 Settings

Use `pydantic-settings` to read environment variables. Fail fast at startup if required production configuration is missing. Do not supply insecure production defaults for secrets.

## 13.2 Database session

- SQLAlchemy 2.x synchronous engine/session is acceptable for this MVP.
- Configure `pool_pre_ping=True` and a bounded pool size.
- Use dependency-managed sessions with guaranteed close/rollback.
- Use transactions for registration, recommendation acceptance and insight regeneration.
- Use `Decimal` for measurements and amounts.
- Add foreign keys and constraints in migrations.
- Avoid N+1 queries; use explicit loading strategies.

## 13.3 Service layer

Keep route handlers thin. Routes should:

1. Parse/validate request.
2. Resolve current user and organisation.
3. Call a service.
4. Return a typed response.

Business formulas belong in `analytics_service.py`; insight rules in `insight_service.py`; recommendation transitions in `recommendation_service.py`; file storage in storage adapters; report construction in `report_service.py`.

## 13.4 Storage adapters

Interface should provide:

- `save(file, object_key, content_type) -> storage_path`
- `create_download_url(storage_path, expires_seconds) -> url` or local authorized stream response
- `delete(storage_path) -> None`

Implement:

- `LocalStorageProvider` for development only; files stored in a local ignored `uploads/` directory.
- `SupabaseStorageProvider` for production; bucket is private.

The production service must refuse to start if `STORAGE_BACKEND=local` unless an explicit local-development setting is active.

For browser upload progress, implement a dedicated `XMLHttpRequest` upload helper (or another library with upload-progress support). Keep the normal JSON API client separate. Do not fake percentages with a timer.

## 13.5 CORS

Allow only explicit configured origins, e.g. local Vite origin and exact deployed Vercel URL. Do not use wildcard origins with credentials. MVP bearer tokens do not require cookie credentials; set credentials false unless the auth design is deliberately changed.

## 13.6 Logging

- Structured logs with request ID.
- Log route, status, duration and safe error category.
- Never log passwords, bearer tokens, JWT secret, API key, database URL, raw invoice bytes/text or full user-entered notes.
- Return safe user-facing errors.

---

# 14. Environment variables and local setup

## 14.1 Frontend `.env.example`

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

This is a public API URL, not a secret. Never add `VITE_OPENAI_API_KEY`, `VITE_DATABASE_URL` or any secret-prefixed variable.

## 14.2 Backend `.env.example`

```dotenv
APP_ENV=development
APP_NAME=SYNERGYX API
API_V1_PREFIX=/api/v1

DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/synergyx
JWT_SECRET_KEY=replace-with-a-random-32-byte-or-longer-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_ISSUER=synergyx-api
JWT_AUDIENCE=synergyx-client

CORS_ORIGINS=http://localhost:5173

STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./uploads
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=utility-documents

AI_PROVIDER=rules
OPENAI_API_KEY=
OPENAI_MODEL=
AI_REQUEST_TIMEOUT_SECONDS=20

MAX_UPLOAD_SIZE_MB=10
LOG_LEVEL=INFO
```

In production, set `APP_ENV=production`, `STORAGE_BACKEND=supabase`, a production database URL, exact CORS origin, strong random JWT secret and provider secrets in hosting dashboards. Keep `AI_PROVIDER=rules` until the OpenAI integration has been tested and organisation consent is enabled.

## 14.3 Local development prerequisites

Install:

- Git.
- Node.js 22 LTS (or a supported current LTS; pin the version in `.nvmrc`).
- Python 3.12.
- Docker Desktop for local PostgreSQL, or a local PostgreSQL 16 installation.
- VS Code / Antigravity or another AI coding environment.

## 14.4 Local setup commands (PowerShell)

From a clean clone:

```powershell
# 1. Start local PostgreSQL (after the agent creates docker-compose.yml)
docker compose up -d db

# 2. Frontend
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev

# 3. In a second terminal: backend
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If Docker Compose is not created, create a local PostgreSQL database and update `DATABASE_URL`. Never use the production database for development tests.

### Dependency lock policy

- Commit `frontend/package-lock.json`; use `npm ci` in CI and deployment, not an unconstrained `npm install`.
- Pin Python dependencies in the generated backend lock / fully pinned requirements file. The agent must resolve compatible versions together, run the full test suite, and commit the resolved pins; do not leave production dependencies as floating `*` versions.
- Record runtime versions in `.nvmrc` and `.python-version` (Node 22 LTS and Python 3.12 for this specification).
- Upgrade dependencies deliberately in a separate change and rerun the full CI suite.

### Required frontend scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

The agent may adjust config to match its TypeScript/Vite version, but all scripts above must remain meaningful and pass.

### Required backend checks

```powershell
ruff check .
ruff format --check .
pytest -q
```

Do not mark a phase complete if a required script is missing or replaced by `echo` / a no-op.

---

# 15. Build sequence for the AI coding agent

**Critical instruction:** build in phases. Do not ask the agent to create the whole app in one giant generation. Each phase ends with tests, a working local run and a Git commit. If a phase fails, fix it before starting the next.

## Phase 0 — Repository audit and execution plan

Agent tasks:

1. Inspect repository files before modifying anything.
2. Read this blueprint completely.
3. Identify existing code that can be safely reused.
4. Report the exact proposed folder changes, dependencies and risks.
5. Create `AGENTS.md` containing the most important rules from sections 0, 2, 8, 9, 10 and 13.
6. Do not delete existing working code without explaining why.

Acceptance:

- No implementation has silently overwritten existing user work.
- Plan is consistent with this blueprint.
- The agent identifies any missing credentials or external account setup.

Commit: `chore: establish synergyx implementation plan`

## Phase 1 — Scaffold and quality tooling

Agent tasks:

1. Create `frontend/` Vite React TypeScript project.
2. Create `backend/` FastAPI structure.
3. Add `.gitignore`, `.editorconfig`, README and examples.
4. Add lint, formatting, type checking and test commands.
5. Add CI workflow skeleton.
6. Add local PostgreSQL Docker Compose file.
7. Do not build features yet.

Acceptance:

- Frontend installs and `npm run build` passes.
- Backend imports and `/health/live` returns 200 locally.
- `git status` shows no `.env`, `.venv`, node_modules, uploaded files or secrets.

Commit: `chore: scaffold frontend backend and tooling`

## Phase 2 — Design system and frontend shell

Agent tasks:

1. Implement design tokens exactly from section 6.
2. Implement public landing, login and register layouts (forms may be wired in Phase 4).
3. Implement AppShell, sidebar, topbar, mobile drawer and page containers.
4. Implement reusable controls, cards, modal, confirm dialog, toast and empty/loading/error states.
5. Implement all protected routes as page shells with clear titles and no fake metrics.
6. Implement animations from section 7 and reduced-motion behaviour.
7. Verify desktop, tablet and mobile layouts.

Acceptance:

- No overflow at 375px, 768px, 1024px and 1440px widths.
- Keyboard navigation and focus states work.
- No dead navigation links.
- Reduced-motion preference is respected.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass.

Commit: `feat: implement synergyx design system and app shell`

## Phase 3 — Database, models and migrations

Agent tasks:

1. Configure environment-based DB URL.
2. Create SQLAlchemy models for tables in section 8.
3. Create Alembic config and first migration.
4. Add database constraints and indexes.
5. Add a test database setup and fixtures.
6. Create organisation-scoped query helpers.
7. Do not use create_all in production.

Acceptance:

- `alembic upgrade head` works on an empty local DB.
- `alembic downgrade -1` and upgrade again work in a disposable test DB.
- Unique constraints reject duplicate month/resource rows.
- Decimal values round-trip correctly.
- Tests pass.

Commit: `feat: add postgres models and alembic migrations`

## Phase 4 — Authentication and organisation isolation

Agent tasks:

1. Implement register, login and `/auth/me`.
2. Hash passwords with Argon2.
3. Create and validate short-lived JWTs with issuer, audience and expiry.
4. Add current-user dependency.
5. Scope every organisation query to the current user.
6. Add exact CORS configuration.
7. Wire frontend auth context, sessionStorage and protected routes.
8. Add login/logout, invalid-credentials, expiry and duplicate-email tests.

Acceptance:

- New account creates organisation + user atomically.
- Password is never stored in plaintext.
- Invalid/expired token returns 401.
- User A cannot read/update/delete User B's records by guessing IDs.
- Logout clears token and cached private queries.
- Tests pass.

Commit: `feat: implement secure authentication and tenant isolation`

## Phase 5 — Business profile, records and private documents

Agent tasks:

1. Implement organisation GET/PATCH.
2. Implement utility and production CRUD APIs.
3. Implement unit validation and canonical conversions.
4. Implement local and Supabase storage adapters.
5. Implement upload/download/delete document routes with access checks.
6. Implement frontend forms, filters, tables, edit/delete confirmations and upload progress.
7. Add validation and storage failure tests.

Acceptance:

- A record persists after page refresh and a new login.
- Duplicate month/resource record returns a useful 409.
- Water L converts to m³ correctly.
- Invalid file type, forged MIME, oversized file and cross-organisation document ID are rejected.
- Production file object is private and signed URLs expire.
- A failed storage upload does not create a phantom DB document.
- Tests pass.

Commit: `feat: implement utility production records and secure uploads`

## Phase 6 — Calculation engine, dashboard and analytics

Agent tasks:

1. Implement pure tested Decimal calculation functions.
2. Implement dashboard summary endpoint.
3. Implement analytics range endpoint.
4. Implement charts and KPI cards using API data only.
5. Implement missing-data and partial-cost coverage behaviour.
6. Implement CSV analytics export and formula-injection protection.

Acceptance:

- Test exact sample calculations from section 16.
- Missing production returns null intensity, not zero.
- Missing prior month returns no month-over-month percentage.
- Partial spend displays coverage warning.
- Dashboard changes after create/update/delete without hard refresh (query invalidation).
- Tests pass.

Commit: `feat: add resource analytics dashboard and exports`

## Phase 7 — Insights and recommendations engine

Agent tasks:

1. Implement starter rules in section 10.
2. Implement insight generation and idempotent upsert.
3. Implement recommendation templates.
4. Implement optional explanation provider interface.
5. Implement rules-only provider first.
6. Implement OpenAI Responses adapter with structured output only after rules flow and schema tests pass.
7. Enforce AI consent and aggregated-only payload.
8. Add timeout, fallback and provider error tests.
9. Wire dashboard/insights/recommendations pages.

Acceptance:

- Rules engine works with no OpenAI key.
- LLM cannot overwrite authoritative metrics.
- Consent false means no external AI call.
- Provider failure falls back to rules without breaking page.
- Regeneration does not create duplicate insights/recommendations.
- Tests pass.

Commit: `feat: add deterministic insights and optional ai explanations`

## Phase 8 — Actions and reports

Agent tasks:

1. Implement action CRUD and status transitions.
2. Implement idempotent recommendation acceptance.
3. Implement monthly report JSON endpoint.
4. Implement CSV download endpoints.
5. Implement print-specific report view.
6. Wire all buttons and state filters.

Acceptance:

- Accepting recommendation twice creates one action only.
- Marking action complete sets server timestamp.
- Reports match underlying database records.
- CSV is correctly escaped and safe against formula injection.
- Tests pass.

Commit: `feat: add action tracker and monthly reports`

## Phase 9 — Full end-to-end QA and security review

Agent tasks:

1. Add Playwright end-to-end tests for the full journey.
2. Test empty account, populated account, API unavailable, invalid token and upload failure.
3. Test at 375px, 768px, 1024px and 1440px.
4. Run dependency/security audit.
5. Search for hardcoded fake metrics, TODO buttons, `onClick={() => {}}`, leaked secrets, direct DB access in frontend and unscoped queries.
6. Fix all critical/high issues.
7. Update README and deployment checklist.

Acceptance:

- CI passes from a clean checkout.
- Full flow works: register → add data → dashboard → generate insights → accept recommendation → complete action → report.
- Organisation isolation tests pass.
- No visible dead controls or unimplemented buttons represented as working.
- No secrets in Git history/current files.

Commit: `test: complete mvp e2e and security checks`

## Phase 10 — Production deployment

Follow section 18 exactly. Deploy backend and database first, migrate, verify health, then deploy frontend. Perform smoke tests using a fresh account. Do not announce the app as deployed until the deployed URL has passed the acceptance checks.

Commit: `chore: prepare production deployment`

---

# 16. Mandatory test dataset and expected calculations

Use this dataset only in automated tests or a clearly labelled local demo account. Never insert it automatically into real production user accounts.

Organisation:

- Industry: textile.
- Production unit: kg.

January:

- Electricity: 10,000 kWh; amount ₹80,000.
- Water: 50,000 L → 50 m³; amount ₹2,000.
- Fuel: 400 L; amount ₹40,000.
- Production: 10,000 kg.

February:

- Electricity: 12,000 kWh; amount ₹96,000.
- Water: 60,000 L → 60 m³; amount ₹2,400.
- Fuel: 440 L; amount ₹44,000.
- Production: 10,000 kg.

March:

- Electricity: 10,500 kWh; amount ₹84,000.
- Water: 55,000 L → 55 m³; amount ₹2,200.
- Fuel: 420 L; amount ₹42,000.
- Production: 10,000 kg.

Expected March analytics:

| Metric | Expected |
|---|---:|
| Electricity intensity | 1.05 kWh/kg |
| February electricity intensity | 1.20 kWh/kg |
| Electricity intensity change vs February | -12.5% |
| Observed electricity reduction vs February at March production | 1,500 kWh |
| Water intensity | 0.0055 m³/kg |
| Fuel intensity | 0.042 L/kg |
| March utility spend | ₹128,200 |
| Cost coverage | 3 of 3 utility types |

Note: ₹128,200 = 84,000 + 2,200 + 42,000.

The app must label the 1,500 kWh result “observed reduction vs previous month”, not “verified saving caused by the recommendation”.

Additional test cases:

1. No production in March → all March intensities are null.
2. No February electricity record → March electricity month-over-month delta is null.
3. Previous electricity quantity is zero → percentage change is null with caveat.
4. March water entered as 55,000 L → stored exactly as 55 m³ (within chosen Decimal precision).
5. One bill amount missing → partial cost coverage `2/3`, spend sum excludes missing amount and UI shows warning.
6. Cross-organisation record ID → 404.
7. Upload >10 MB → 413 or validation error with stable code.
8. `application/pdf` with non-PDF bytes → reject.
9. AI provider disabled → rules response, no network call.
10. AI provider returns malformed schema / times out → rules fallback.
11. Accept recommendation twice → exactly one linked action.
12. User logs out → private data queries are cleared.

---

# 17. Automated testing and CI gates

## 17.1 Backend tests

Use pytest. Add:

- Unit tests for each pure calculation and conversion.
- Unit tests for each rules-engine condition and threshold boundary.
- Schema tests for invalid resource/unit/date/amount combinations.
- Auth tests for register/login/expiry/invalid password.
- Integration tests against PostgreSQL for constraints and transactions.
- Organisation isolation tests for every resource family.
- Storage adapter tests using a fake provider plus local provider tests.
- API tests for success, validation, not found, conflict and provider outage.

Do not rely only on SQLite if PostgreSQL is the production database; use a PostgreSQL service for CI integration tests.

## 17.2 Frontend tests

Use Vitest + React Testing Library:

- Form validation.
- API client error handling and 401 logout.
- Protected routes.
- Button disabled/loading behaviour.
- Empty/loading/error states.
- Number/currency/unit formatting.
- Query invalidation after save/delete.

Use Playwright for full journey and responsive smoke tests.

## 17.3 CI workflow

On every pull request and push:

1. Install frontend dependencies with `npm ci`.
2. Run frontend lint.
3. Run TypeScript typecheck.
4. Run frontend unit tests.
5. Run production frontend build.
6. Install backend dependencies.
7. Run Ruff lint and format check.
8. Start PostgreSQL service.
9. Run Alembic migrations.
10. Run backend tests.
11. Run Playwright smoke test if configured.

A failing step must fail the CI job. Never add `|| true` to hide failures.

---

# 18. Deployment guide — Vercel + Render + Supabase

## 18.1 Accounts and services to create

1. GitHub repository for the source code.
2. Supabase project for PostgreSQL and private Storage.
3. Render Web Service connected to the GitHub repository for FastAPI.
4. Vercel project connected to the same repository for the Vite frontend.

Use separate development and production projects when possible. Never point local tests at production.

## 18.2 Supabase setup

1. Create a new Supabase project and choose a region close to the intended users.
2. Wait until the database is provisioned.
3. In Project Settings → Database, obtain the PostgreSQL connection string. For a persistent Render web service, prefer a connection method compatible with a long-running SQLAlchemy connection pool. Use the Supabase session pooler when direct networking/IPv6 compatibility is uncertain. Do not blindly use transaction pooling for session-dependent behaviour.
4. Convert the URL scheme to `postgresql+psycopg://` if the SQLAlchemy psycopg v3 driver is used. URL-encode special characters in the password.
5. Create a Storage bucket named `utility-documents`.
6. Set the bucket to **private**.
7. Configure a maximum file size of 10 MB and allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`.
8. Copy project URL and service-role key into the backend environment only. Never place the service-role key in frontend variables or source code.
9. Run the first Alembic migration against this database from a controlled deployment step.
10. Upload a test document through the backend and verify that a public unauthenticated URL cannot retrieve it.

Because the backend uses the service-role key, it must perform strict organisation ownership checks before every storage operation. The key bypasses normal user-level policies; never trust a path or organisation ID supplied by the browser.

## 18.3 Render backend setup

Create a Web Service:

- Repository: the SYNERGYX GitHub repository.
- Root directory: `backend`.
- Runtime: Python 3.12.
- Build command: `pip install -r requirements.txt`.
- Pre-deploy command: `alembic upgrade head` if the Render service configuration supports a pre-deploy command. If unavailable, execute migrations once through Render Shell / controlled release procedure before directing traffic. Do not hide migrations inside module import.
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Health check path: `/health/ready`.

Set backend environment variables in Render dashboard:

```dotenv
APP_ENV=production
APP_NAME=SYNERGYX API
API_V1_PREFIX=/api/v1
DATABASE_URL=<SUPABASE_POSTGRES_CONNECTION_STRING_USING_PSYcopg_DRIVER>
JWT_SECRET_KEY=<GENERATE_A_UNIQUE_RANDOM_SECRET>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_ISSUER=synergyx-api
JWT_AUDIENCE=synergyx-client
CORS_ORIGINS=https://<YOUR-VERCEL-DOMAIN>
STORAGE_BACKEND=supabase
SUPABASE_URL=<YOUR_SUPABASE_PROJECT_URL>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
SUPABASE_STORAGE_BUCKET=utility-documents
AI_PROVIDER=rules
OPENAI_API_KEY=
OPENAI_MODEL=
AI_REQUEST_TIMEOUT_SECONDS=20
MAX_UPLOAD_SIZE_MB=10
LOG_LEVEL=INFO
```

`OPENAI_API_KEY` and `OPENAI_MODEL` remain blank until the provider is configured. If using external AI, set them only in Render, enable organisation consent deliberately, and test the fallback path.

After first deploy:

1. Open Render service logs.
2. Confirm migration completed.
3. Check `https://<render-service>.onrender.com/health/live` returns 200.
4. Check `/health/ready` returns 200.
5. Open `/docs` only if enabled and verify route registration.
6. Confirm CORS accepts only the deployed Vercel origin and local development origin if deliberately retained.

## 18.4 Vercel frontend setup

Create a Vercel project:

- Repository: same GitHub repository.
- Root directory: `frontend`.
- Framework preset: Vite.
- Build command: `npm run build` (or `npm ci && npm run build` if needed by project settings).
- Output directory: `dist`.
- Install command: `npm ci`.

Add this production environment variable:

```dotenv
VITE_API_BASE_URL=https://<YOUR-RENDER-SERVICE>.onrender.com/api/v1
```

This is a public API base URL. Do not put any key or secret here.

Create `frontend/vercel.json` for SPA deep-link fallback:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Deploy. Verify direct refresh on `/login` and `/app/dashboard` works. Vite SPA deployments need a rewrite so deep links resolve to the app shell.

## 18.5 CORS final check

The backend `CORS_ORIGINS` must exactly match the production browser origin, e.g. `https://synergyx-team.vercel.app`. Do not add a trailing path. If a custom domain is added, add its exact origin and redeploy the backend.

Do not use `allow_origins=["*"]` with credentials. The current bearer-token design does not need cookie credentials.

## 18.6 Deployment smoke-test checklist

Use a fresh production test account:

- [ ] Landing page loads over HTTPS.
- [ ] Register creates user + organisation.
- [ ] Login works and `/auth/me` returns correct profile.
- [ ] Logout clears access.
- [ ] Refreshing a protected route does not produce Vercel 404.
- [ ] Add electricity record and refresh browser; record persists.
- [ ] Add water and fuel records.
- [ ] Add production record.
- [ ] Upload allowed PDF/image; file is private.
- [ ] Attempt to upload a forbidden file; API rejects it.
- [ ] Dashboard numbers match saved records.
- [ ] Analytics units and percentages are correct.
- [ ] Generate insights with rules provider.
- [ ] Accept recommendation; only one action is created.
- [ ] Mark action completed.
- [ ] Generate report and download CSV.
- [ ] Open the app in a second account and verify the first account's data is not visible.
- [ ] Check browser console and Render logs for errors or leaked secrets.

Do not share the production URL as “ready” until all critical checks pass.

## 18.7 Rollback and migration safety

- Commit every successful phase.
- Keep the last known-good Vercel and Render deployment available for rollback.
- Back up the database before destructive schema migration.
- Prefer additive migrations (add nullable column, backfill, then enforce constraint) over destructive one-step changes.
- Do not run downgrade on production as a casual rollback plan; restore from a known backup or deploy a forward-fix migration.
- Before changing a column type or production unit semantics, export and inspect affected rows.

---

# 19. Privacy, security and reliability checklist

## Authentication and authorisation

- [ ] Add a basic login/register rate limit and generic invalid-credential response; document that process-local rate limiting is not sufficient after horizontal scaling.
- [ ] Argon2 password hashes; no plaintext password storage.
- [ ] JWT secret generated uniquely for each environment.
- [ ] Access token expires after 30 minutes.
- [ ] Issuer, audience, expiry and signature validated.
- [ ] Every private endpoint uses authenticated user dependency.
- [ ] Every query is scoped by organisation ID.
- [ ] Cross-organisation ID tests exist.

## Secrets

- [ ] No `.env` file committed.
- [ ] No secrets in frontend `VITE_*` variables.
- [ ] Service-role key only on backend.
- [ ] LLM key only on backend.
- [ ] Logs redact credentials and user content.

## Uploads

- [ ] Private bucket.
- [ ] Strict 10 MB limit.
- [ ] MIME + extension + file signature validation.
- [ ] Random object keys.
- [ ] Signed URLs short-lived.
- [ ] Ownership check before download/delete.
- [ ] File cleanup on failed DB transaction.

## Reliability

- [ ] Database health/readiness endpoint.
- [ ] DB connection pool health check.
- [ ] Explicit API timeout for external AI.
- [ ] Deterministic fallback.
- [ ] Frontend error boundary.
- [ ] Loading, empty and error states.
- [ ] No automatic retry for non-idempotent POST.
- [ ] Transaction around multi-table writes.

## Data integrity

- [ ] `NUMERIC` and `Decimal` for resource quantities and money.
- [ ] Canonical units enforced server-side.
- [ ] Unique monthly records enforced by DB constraints.
- [ ] No missing value represented as zero.
- [ ] No unverified benchmark/emission factor.
- [ ] Estimates display assumptions and comparison period.

---

# 20. Definition of Done — MVP release gate

The MVP is complete only when every item below is true.

### Product

- [ ] User can register, log in and log out.
- [ ] User can edit business profile.
- [ ] User can create, edit and delete monthly utility records.
- [ ] User can create, edit and delete monthly production records.
- [ ] User can upload and view a private bill document.
- [ ] User can see dashboard metrics from persisted data.
- [ ] User can see analytics with correct units and caveats.
- [ ] User can generate rules-based insights without external AI.
- [ ] Optional AI explanations work only with consent and safely fall back.
- [ ] User can accept/dismiss recommendations.
- [ ] User can track actions and completion status.
- [ ] User can generate a monthly report and export CSV.

### Engineering

- [ ] Database migrations work from an empty database.
- [ ] Backend unit + integration tests pass.
- [ ] Frontend lint + typecheck + unit tests + build pass.
- [ ] E2E main journey passes.
- [ ] Organisation isolation tests pass.
- [ ] No critical/high security issue remains.
- [ ] No dead buttons, placeholder API handlers or fake records in production.
- [ ] No secrets committed.
- [ ] README includes local run and deployment commands.

### Deployment

- [ ] Supabase database and private storage configured.
- [ ] Render API deployed and ready endpoint healthy.
- [ ] Alembic migrations applied.
- [ ] Vercel frontend deployed and SPA deep links work.
- [ ] Production CORS exact origin works.
- [ ] Production smoke checklist passes.
- [ ] Rollback path documented.

---

# 21. Master prompt for Antigravity / AI coding agent

Copy the prompt below into the coding agent after placing this file at the repository root.

```text
You are the senior full-stack engineer responsible for implementing SYNERGYX.

FIRST: read the entire SYNERGYX_MVP_BLUEPRINT.md and AGENTS.md before editing any code.
Treat the blueprint as the source of truth. Do not skip phases or build the full app in one pass.

PRODUCT:
SYNERGYX is an AI-powered industrial resource intelligence platform for small and medium manufacturing businesses. It turns monthly utility and production records into analytics, explainable insights, practical recommendations, tracked actions and transparent before/after comparisons.

LOCKED STACK:
- Frontend: React + TypeScript + Vite
- Backend: Python 3.12 + FastAPI + Pydantic v2
- Database: PostgreSQL + SQLAlchemy 2.x + Alembic
- File storage: private Supabase Storage in production; local adapter in development
- Auth: Argon2 password hashing + short-lived JWT bearer access token
- Data fetching: TanStack Query
- Forms: React Hook Form + Zod
- Charts: Recharts
- Icons: lucide-react
- Motion: Framer Motion
- Hosting: Vercel frontend + Render backend + Supabase database/storage

NON-NEGOTIABLE RULES:
1. Build one phase at a time using section 15. Do not jump ahead.
2. Before writing code, inspect the repository and identify existing work. Never overwrite working files blindly.
3. Do not create a static mockup in place of working functionality.
4. Every visible button must have a real action, loading/disabled state, success state and error state. No empty handlers, no dead links.
5. Never hardcode dashboard numbers or inject demo data into real accounts.
6. Never expose database URLs, JWT secrets, Supabase service-role key or LLM API key to the browser.
7. All organisation-owned data must be queried using the authenticated user's organisation ID. Never trust an organisation ID sent by the client.
8. Use Decimal / PostgreSQL NUMERIC for money and measured values.
9. Use Alembic migrations. Never use create_all for production schema setup.
10. The backend owns authoritative calculations. The LLM may explain approved aggregated facts but may not calculate or replace numeric results.
11. Rules-based insights must work when the external AI key is missing or the provider is down.
12. External AI is off by default and only enabled after organisation consent. Never transmit raw bills, names, email, exact location or invoice text.
13. Uploaded documents must be private, file-type checked, size-limited and ownership-checked.
14. Keep missing data as null, not zero. Show units and caveats.
15. Do not claim causality, verified savings, machine faults or industry benchmarks without supporting data.
16. Respect the lavender light theme and reduced-motion preference in the blueprint.
17. No secrets in Git, screenshots, logs, fixtures or frontend bundles.
18. If a requirement is ambiguous, choose the safest minimal implementation and record the decision in `docs/DECISIONS.md`. Do not invent product scope.

WORKING METHOD:
- State the current phase and the exact files you intend to create/change.
- Implement only that phase.
- Run the required format, lint, typecheck, unit, integration and build commands for the affected layer.
- Fix all failures before saying the phase is complete.
- Inspect the diff for accidental edits, dead controls, secrets, unscoped DB queries and fake data.
- Report commands run and their actual pass/fail results. Never claim a test passed if you did not run it.
- Create a Git commit after each accepted phase using the commit message specified in the blueprint.
- If credentials or an external dashboard action are required, implement the code/config placeholder safely and provide exact manual setup instructions. Never fabricate credentials or pretend deployment succeeded.

START NOW WITH PHASE 0 ONLY. Do not implement Phase 1 until the repository audit and plan are complete.
```

---

# 22. Phase prompts to use one at a time

After the master prompt has been accepted, use these prompts sequentially. The agent must not start the next phase until the current phase passes its acceptance checks.

## Prompt — Phase 1

```text
Implement only Phase 1 from section 15 of SYNERGYX_MVP_BLUEPRINT.md. Scaffold the frontend and backend, local PostgreSQL, lint/typecheck/test scripts, CI skeleton, README and .env.example files. Do not add product features. Run all acceptance commands and report exact results. Stop when Phase 1 is complete.
```

## Prompt — Phase 2

```text
Implement only Phase 2 from section 15. Build the lavender-light design system, responsive app shell, public pages, protected page shells, reusable UI controls, loading/empty/error states and specified animations. Do not use fake metrics. Verify keyboard focus, reduced motion and the four target widths. Run lint, typecheck, tests and production build. Stop when Phase 2 passes.
```

## Prompt — Phase 3

```text
Implement only Phase 3. Create SQLAlchemy models, constraints, indexes, Alembic migration and PostgreSQL test fixtures exactly as defined in section 8. Test a fresh migration, downgrade/upgrade in a disposable test database, unique constraints and Decimal round-trip. Do not implement API features yet. Stop when tests pass.
```

## Prompt — Phase 4

```text
Implement only Phase 4. Add Argon2 auth, JWT validation, register/login/me endpoints, organisation creation, current-user dependency, CORS and frontend protected-route integration. Add a two-user organisation-isolation test. Do not continue if any private query is not scoped. Run tests and stop.
```

## Prompt — Phase 5

```text
Implement only Phase 5. Add organisation settings, utility and production record CRUD, unit conversion, local/Supabase storage adapters, secure document upload/download/delete and all matching frontend forms/buttons. Test MIME spoofing, file size, ownership and storage failure cleanup. Keep OCR out of scope. Stop when tests pass.
```

## Prompt — Phase 6

```text
Implement only Phase 6. Build Decimal-based calculations, dashboard summary, analytics endpoints, charts, missing-data rules, partial cost coverage and safe CSV export. Use the exact test dataset and expected calculations in section 16. No frontend hardcoded KPI values. Stop when all numerical tests pass.
```

## Prompt — Phase 7

```text
Implement only Phase 7. Add deterministic insight rules and recommendation templates first. Then add an optional LLM provider behind organisation consent, using aggregated non-identifying facts and structured output validation. Ensure no key means rules-only operation and any provider failure falls back safely. Test thresholds, consent, malformed output, timeout and duplicate generation. Stop when tests pass.
```

## Prompt — Phase 8

```text
Implement only Phase 8. Add action CRUD, recommendation accept/dismiss, idempotent action creation, monthly reports, CSV exports and print view. Test status transitions, report consistency and CSV formula-injection protection. Wire every button and stop when all tests pass.
```

## Prompt — Phase 9

```text
Implement only Phase 9. Add Playwright tests for register → records → analytics → generate insights → accept recommendation → complete action → report. Test responsive sizes, network failures, invalid token, file rejection and two-account isolation. Search for fake data, dead controls, empty handlers, exposed secrets, direct frontend DB access and unscoped queries. Fix all critical/high issues. Run the entire CI suite and report exact results. Stop before deploying.
```

## Prompt — Phase 10

```text
Implement only Phase 10. Prepare the production build and deployment configuration for Vercel, Render and Supabase following section 18. Do not claim deployment is complete until the actual hosting dashboards have been configured and the production smoke tests pass. Give me the exact manual dashboard steps and environment-variable names. Never print secret values. Stop and report any external setup that requires my action.
```

---

# 23. Final build order summary

Recommended implementation order:

1. Repository + tooling.
2. UI shell + design system.
3. Database + migrations.
4. Authentication + organisation isolation.
5. Utility/production records + file storage.
6. Calculations + dashboard + analytics.
7. Rules-based insights + optional AI explanation.
8. Recommendations + action tracker + reports.
9. E2E tests + security review.
10. Supabase + Render + Vercel deployment.

**Do not start with animations or advanced AI.** First make account creation, database persistence, record validation and core calculations work. Then polish the experience and add the optional AI explanation layer.

---

# 24. Official technical references

Use these official references while implementing. Check the current documentation for changes before pinning dependency versions or copying provider-specific code.

- FastAPI security with OAuth2, JWT and password hashing: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- Render FastAPI deployment guide: https://render.com/docs/deploy-fastapi
- Render environment variables and secret configuration: https://render.com/docs/configure-environment-variables
- Render deploy lifecycle and pre-deploy commands: https://render.com/docs/deploys
- Vite environment variables and the warning about `VITE_*` exposure: https://vite.dev/guide/env-and-mode
- Vite static deployment / Vercel: https://vite.dev/guide/static-deploy
- Vercel Vite SPA deployment and deep-link rewrite: https://vercel.com/docs/frameworks/frontend/vite
- Supabase private storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase signed URLs for private assets: https://supabase.com/docs/guides/storage/serving/downloads
- Supabase database pooling guidance: https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits
- OpenAI Responses API overview: https://developers.openai.com/api/reference/responses/overview
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

---

**End of specification — SYNERGYX MVP Blueprint v1.0**
