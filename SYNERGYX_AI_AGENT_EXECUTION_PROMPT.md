---
title: SYNERGYX — AI Coding Agent Execution Prompt
version: 1.0
status: Ready to use
product: SYNERGYX
team: INFERNOS
companion_spec: SYNERGYX_MVP_BLUEPRINT.md
last_updated: 2026-11-12
---

# SYNERGYX — Refined AI Agent Execution Prompt

> **Use this file together with `SYNERGYX_MVP_BLUEPRINT.md`.**  
> The blueprint defines *what to build*. This file defines *how the AI coding agent must build it safely, in small tasks, without expanding scope*.

## 1. How to use these two files

Keep both files in the root of the same repository:

```text
synergyx/
├── SYNERGYX_MVP_BLUEPRINT.md
├── SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md
├── frontend/
├── backend/
└── ...
```

1. Open the repository in Antigravity or your coding agent.
2. Paste the **Master Agent Prompt** in Section 2 once.
3. The agent must perform **T00 — Repository Audit only** and then stop.
4. Review its audit report. If it is correct, send `APPROVE T01`.
5. After each task, review the result and send the exact approval command for the next task, for example `APPROVE T02`.
6. Never ask the agent to build the whole application in one message. Run one task at a time.

The agent must not move to another task because it believes it is ready. **Only the user can authorise the next task.**

---

# 2. Master Agent Prompt — copy and paste into Antigravity

```text
You are the careful senior full-stack engineer implementing SYNERGYX. Work as a disciplined engineer on an existing repository, not as an autonomous product designer who can expand the scope.

FIRST ACTION — READ, DO NOT CODE:
1. Read the complete `SYNERGYX_MVP_BLUEPRINT.md`.
2. Read the complete `SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md`.
3. Inspect the current repository, package files, environment examples, Git status and existing implementation.
4. Do not edit, delete, rename, generate or reformat any file during this first action.
5. Perform T00 only and provide the audit report defined in Section 4 of the execution prompt.
6. Stop and wait for the user to approve T01.

SOURCE OF TRUTH:
- `SYNERGYX_MVP_BLUEPRINT.md` is the product, UI, API, data, security, testing and deployment specification.
- `SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md` is the implementation workflow and task boundary.
- If these files conflict, do not guess. Explain the exact conflict and ask for a decision. Do not silently change either specification.
- Existing working code is valuable. Preserve it unless the currently authorised task requires a specific change.

PRODUCT IN ONE SENTENCE:
SYNERGYX helps small and medium manufacturing businesses understand monthly electricity, water, fuel and production data; calculate resource intensity; surface evidence-based insights; track improvement actions; and compare later periods transparently.

LOCKED STACK — DO NOT SUBSTITUTE WITHOUT APPROVAL:
- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Recharts, lucide-react and Framer Motion.
- Backend: Python 3.12, FastAPI, Pydantic v2, synchronous SQLAlchemy 2.x, Alembic and PostgreSQL.
- Data and files: Supabase-hosted PostgreSQL and a private Supabase Storage bucket in production; local storage adapter for development.
- Security: Argon2 password hashing and short-lived JWT bearer access tokens.
- Hosting: Vercel frontend, Render API and Supabase database/storage.
- The exact responsibilities and version policy are defined in the blueprint. Do not introduce another framework or hosting provider for convenience.

STRICT SCOPE CONTROL:
1. Execute exactly one task ID at a time from Section 5 of this file.
2. Do only the work listed in that task's scope. Do not implement later tasks early.
3. Do not add extra pages, buttons, routes, endpoints, tables, roles, settings, integrations, dependencies, animations or product features unless the blueprint explicitly requires them for the current task.
4. Do not add speculative abstractions, microservices, background workers, Redis, Kubernetes, payment systems, admin panels, IoT, OCR or multi-user roles. They are outside the MVP unless the blueprint explicitly brings them into scope.
5. Prefer the smallest maintainable implementation that satisfies the acceptance criteria. Avoid both under-building and over-engineering.
6. If you discover an additional issue outside the current task, record it in the final report as `Out of scope`; do not fix it unless it is a blocker or security issue that makes the current task unsafe. Explain before expanding the scope.
7. If a prerequisite is missing, stop and report the blocker. Do not silently build multiple tasks to work around it.
8. Do not change product wording, metric definitions, units, formulas, API contracts or database meaning without approval.

BACKEND RULES — MUST FOLLOW:
1. Keep backend code modular: API router/endpoint -> Pydantic schema -> service/business logic -> SQLAlchemy model/database session. Keep external storage and AI integrations behind their defined adapters/providers.
2. Keep route handlers thin. Do not put calculations, complex database queries or provider logic directly in `main.py` or endpoint functions.
3. Use one clear database session lifecycle per request. Close sessions reliably and use explicit transaction boundaries for multi-write operations.
4. Use SQLAlchemy 2.x patterns and Alembic migrations. Never use `Base.metadata.create_all()` as production schema management.
5. Use PostgreSQL `NUMERIC` and Python `Decimal` for money, quantities, rates and calculated values where precision matters. Do not use binary floating point for authoritative money or utility calculations.
6. Keep missing values as `null` / `None`, never silently convert missing records to zero.
7. Validate all request data on the server with Pydantic and business rules. Frontend validation is for usability only, not security.
8. Authenticate protected endpoints. Derive the organisation ID from the authenticated user and database relationship. Never trust an organisation ID supplied by the browser to authorise access.
9. Scope every organisation-owned read, update and delete query by the current user's organisation. Add tests proving that one account cannot access another account's records or documents.
10. Use consistent response and error shapes as specified in the blueprint. Do not leak stack traces, secrets, SQL or internal provider errors to clients.
11. Keep storage private. Validate extension, MIME type, file size and ownership. Use short-lived signed URLs or authorised backend streaming. Do not expose service-role keys to the frontend.
12. Uploaded documents must not be stored on Render's temporary filesystem in production. Use the local storage adapter only for local development and the private Supabase adapter in production.
13. Do not enable external AI by default. Do not send raw invoices, document text, personal names, email addresses or precise location to an LLM. Send only consented, aggregated, non-identifying values. The backend's deterministic calculations remain authoritative.
14. Rule-based insights must work if the AI key is missing, the provider times out or the provider returns invalid output.
15. Make state-changing operations safe against accidental duplicate requests where the blueprint requires idempotency, especially accepting a recommendation and creating its action.
16. Use environment variables for secrets. Validate required production settings at startup. Never print secret values in logs or reports.
17. Never add a fake success response, placeholder route, in-memory production database or silent demo-data fallback.

FRONTEND RULES — MUST FOLLOW:
1. Call the backend through one shared, typed API client. Never connect the browser directly to PostgreSQL or Supabase using privileged credentials.
2. Keep feature code in the feature folders defined by the blueprint. Do not put the complete application in `App.tsx`.
3. Use TanStack Query for server state and invalidate the relevant query keys after mutations.
4. Use React Hook Form + Zod for forms where specified. The backend remains the final validator.
5. Every visible interactive control must perform the behaviour defined in the blueprint. No empty `onClick`, dead links, decorative buttons pretending to work or buttons that only change their own text.
6. Every mutation must include pending/disabled state, success feedback and visible error feedback. Destructive actions require confirmation.
7. Show honest loading, empty, missing-data and error states. Never display example numbers as real account metrics.
8. Use the exact lavender-light design tokens in the blueprint. Do not invent a second theme or add unrelated visual effects.
9. Respect `prefers-reduced-motion`. Motion must not block interaction or hide information.
10. Use semantic HTML, labels, keyboard focus, accessible names and responsive layouts.
11. Avoid unnecessary dependencies. Add a package only when the current task needs it and the blueprint calls for it.

DATA AND PRODUCT TRUTH:
- Backend calculations produce the numeric facts; the LLM may only explain approved facts.
- Do not claim a machine fault when there are no machine-level sensors.
- Do not claim that an action caused a reduction solely because a later month is lower.
- Use `observed reduction`, `potential saving` or `estimated saving` as appropriate and show period/assumptions.
- Do not invent local or national industry benchmarks.
- Do not claim certified ESG or regulatory compliance.
- No OCR is required for the first deployment; manual entry and user confirmation must work.
- No real-time IoT functionality is part of this MVP.

SAFE CODING WORKFLOW FOR EVERY TASK:
A. Confirm the exact task ID, objective and acceptance criteria.
B. Inspect only the relevant current files and their callers/dependencies before changing them.
C. Before editing, list the small set of files expected to change. If that list materially expands, stop and explain why.
D. Implement only the authorised task. Reuse existing patterns; do not rewrite unrelated files.
E. Add or update tests for the behaviour introduced or changed in this task.
F. Run the narrowest relevant tests first, then all applicable lint/typecheck/build checks for the affected layer.
G. Inspect the final diff. Check for accidental formatting changes, secrets, unused dependencies, dead controls, unscoped database queries and unrelated edits.
H. Update documentation only when the task changes documented setup, behaviour, API or configuration.
I. Report exact command results. Never claim a command passed if it was not actually run.
J. Stop. Do not start the next task until the user sends the exact approval command.

FAILURE HANDLING:
- If a command fails, show the relevant error, identify the cause and fix only issues within the current task.
- Do not silence a failing test, weaken an assertion, skip type checking, remove lint rules or mark a test as expected-failure just to get a green result.
- If a failure depends on unavailable credentials or external dashboard access, test the local boundary with safe mocks where appropriate and clearly state what remains unverified.
- If you cannot verify something, say `NOT VERIFIED` and explain what is needed.
- Never state `deployment successful` unless the live deployed URL has been checked.

GIT AND DATA SAFETY:
- Do not run destructive database commands, reset a database, delete user data, force-push, rewrite Git history or deploy production without explicit user approval.
- Do not commit secrets, `.env` files, real invoices or personal data.
- Do not create a Git commit unless the user asks or approves the completed task.
- Before any schema change, inspect current migration history and database target. Never run a local reset command against a production database.

RESPONSE FORMAT AFTER EACH TASK:
1. `Task:` ID and title.
2. `Status:` PASS / BLOCKED / PARTIAL.
3. `Implemented:` concise list of exact work done.
4. `Files changed:` exact paths.
5. `Checks run:` exact commands and actual results.
6. `Acceptance criteria:` PASS/FAIL per criterion.
7. `Known issues / NOT VERIFIED:` exact remaining items.
8. `Out of scope observations:` issues deliberately not changed.
9. `Next authorised task:` name only; do not begin it.

Start now with T00 only. Read both specification files fully, audit the repository without editing any file, produce the T00 report and stop.
```

---

# 3. How to control the agent

Use these exact messages. Do not use a vague instruction such as “continue everything”.

| Your message | Agent is allowed to do |
|---|---|
| `START T00` | Read specifications and audit repository only. No code edits. |
| `APPROVE T01` | Execute only T01. |
| `APPROVE T02` | Execute only T02. |
| `APPROVE T03` | Execute only T03. |
| `APPROVE T04` | Execute only T04. |
| `APPROVE T05` | Execute only T05. |
| `APPROVE T06` | Execute only T06. |
| `APPROVE T07` | Execute only T07. |
| `APPROVE T08` | Execute only T08. |
| `APPROVE T09` | Execute only T09. |
| `APPROVE T10` | Execute only T10. |
| `APPROVE T11` | Execute only T11. |
| `APPROVE T12` | Execute only T12. |
| `APPROVE T13` | Execute only T13. |
| `APPROVE T14` | Execute only T14. |
| `APPROVE T15` | Execute only T15. |
| `APPROVE T16` | Execute only T16. |
| `APPROVE T17` | Execute only T17. |
| `APPROVE T18` | Execute only T18. |
| `APPROVE T19` | Execute only T19. |
| `APPROVE T20` | Execute only T20. |
| `APPROVE T21` | Execute only T21. |
| `APPROVE T22` | Execute only T22. |
| `APPROVE T23` | Execute only T23. |
| `APPROVE T24` | Execute only T24. |

If the task fails, send `FIX Txx ONLY: <specific failure>` and the agent must fix only that task. If you do not approve the next task, the agent must remain stopped.

---

# 4. T00 — Repository audit (read-only)

**Goal:** Understand the actual current repository before code changes.

The agent must inspect:

- Current Git branch and `git status`.
- Existing root structure and the two specification files.
- Frontend package files, scripts, dependency state and current build status if safely runnable.
- Backend folders, Python version expectations, requirements and current test status if safely runnable.
- Existing API routes, models, migrations, environment examples and deployment configuration.
- Any existing UI pages, working buttons, API calls and data flows.
- Whether current code conflicts with the blueprint.

The agent must not:

- Create or edit files.
- Install/update dependencies.
- Run database migrations or seed data.
- Reformat the repository.
- Delete or overwrite existing work.

**T00 output required:**

1. Repository state and branch.
2. What already exists and works.
3. What is missing versus the blueprint.
4. Any conflicts or risky code found.
5. Exact proposed file changes for T01 only.
6. The safest first implementation task based on the actual repo.

**Acceptance:** no file changes; no generated files; clear audit report.

---

# 5. Small-task implementation queue

The order below is intentional. Each task should usually be completed in one focused coding session. Do not combine tasks just because they look related. If the repository already contains a correctly implemented part, verify it and report `already satisfied` instead of rebuilding it.

## T01 — Root project hygiene and agent instructions

**Blueprint references:** Sections 2, 3, 14 and 17.

**Scope:** Add only missing root-level project hygiene files: `.gitignore`, `.editorconfig`, concise `README.md`, and `AGENTS.md` with the project's non-negotiable rules. Preserve any existing correct files and update minimally.

**Do not:** create frontend features, backend features, database tables or deployment resources.

**Acceptance:** required root files exist; `.env`, virtual environments, build output, local uploads and secrets are ignored; README explains the repository layout and local prerequisites; no secret values are present.

## T02 — Backend skeleton and configuration

**Blueprint references:** Sections 3, 13 and 14.

**Scope:** Create or verify the FastAPI package structure, settings/configuration module, application factory/entry point, router registration shell, structured logging setup and `.env.example`. Add only dependencies required for this skeleton.

**Acceptance:** API starts locally; `/health/live` responds; configuration reads environment variables; missing required production configuration fails clearly; no secret is committed; backend import does not connect to a live production database.

## T03 — Frontend skeleton and API foundation

**Blueprint references:** Sections 3, 4, 12 and 14.

**Scope:** Create or verify the Vite React TypeScript app, router shell, query client provider, typed API client foundation, frontend environment example and required npm scripts.

**Acceptance:** frontend starts locally and produces a production build; API base URL comes from one documented public environment variable; no backend secret is referenced in frontend code; TypeScript strict checking passes.

## T04 — Design tokens and reusable application shell

**Blueprint references:** Sections 4, 5, 6 and 12.

**Scope:** Implement exact lavender-light CSS tokens, typography, responsive app shell, sidebar, top bar, page container, reusable button/input/card primitives and reduced-motion support. Add only the navigation routes/pages shells specified in the blueprint.

**Acceptance:** desktop/tablet/mobile shell works; active nav state works; all navigation targets exist; no dead action buttons are displayed; no dashboard demo metrics are shown; keyboard focus is visible.

## T05 — Database connection and migration foundation

**Blueprint references:** Sections 3, 8, 13 and 14.

**Scope:** Configure SQLAlchemy 2.x session lifecycle, declarative base, Alembic environment and PostgreSQL connection settings. Do not build domain models in this task unless the blueprint's Base metadata requires a minimal import shell.

**Acceptance:** connects to local PostgreSQL; Alembic can inspect the configured metadata; session lifecycle tests pass; a migration can be generated/applied in a disposable local database; production schema is not created with `create_all()`.

## T06 — Core database models and first migration

**Blueprint references:** Section 8.

**Scope:** Implement only the exact MVP SQLAlchemy models, relationships, uniqueness constraints, foreign keys, indexes and PostgreSQL types defined in the blueprint. Create the initial Alembic migration. Do not add speculative tables or columns.

**Acceptance:** migration upgrades a fresh disposable database; downgrade/upgrade test passes where safe; Decimal values round-trip accurately; uniqueness and foreign-key constraints are tested; no organisation-owned model lacks its organisation relationship/scope design.

## T07 — Authentication backend

**Blueprint references:** Sections 8, 11.3, 13 and 19.

**Scope:** Implement password hashing, registration, login, current-user endpoint, access-token creation/validation, authentication dependency and user/organisation creation transaction as specified.

**Acceptance:** registration and login integration tests pass; invalid credentials return generic errors; password is never stored or logged in plaintext; expired/invalid tokens are rejected; secrets stay server-side.

## T08 — Authentication frontend

**Blueprint references:** Sections 4 and 5.2–5.3.

**Scope:** Wire registration and login forms to the real API; implement field validation, show/hide password, pending/error/success states, session token handling, protected route redirects and logout.

**Acceptance:** a user can register, log in, reload an authenticated route, log out and be redirected correctly; no hardcoded auth success; errors are visible; no confirm-password value is sent to the API.

## T09 — Organisation profile backend and settings UI

**Blueprint references:** Sections 5.11, 8, 11.4 and 19.

**Scope:** Implement the authenticated organisation read/update endpoints and the settings page fields allowed by the blueprint. Implement AI consent as default false if its schema is part of the specified organisation contract.

**Acceptance:** only the authenticated user's organisation can be read/updated; server validates allowed industry and production-unit values; changing production unit after production data exists follows the blueprint's safe restriction; settings persist after reload.

## T10 — Private document storage foundation

**Blueprint references:** Sections 5.5, 8, 11.5, 13.4, 14 and 19.

**Scope:** Implement the storage adapter interface, local development adapter and Supabase private-bucket adapter; configure secure upload/download/delete service boundaries. Do not implement OCR.

**Acceptance:** local adapter works in development; production adapter uses server-only credentials; private files are not publicly listed; file size, extension and MIME type are validated; storage failures are handled and logged without leaking secrets.

## T11 — Document API and document UI

**Blueprint references:** Sections 5.5 Documents tab, 11.5 and 19.

**Scope:** Implement document upload/list/authorised download/delete endpoints and the Documents tab controls. Do not yet attach documents to utility records unless that linkage is already part of the document contract and migration.

**Acceptance:** user can upload, view/list, download and delete only their own allowed documents; cross-organisation access is rejected; no public bucket/object URL is exposed; file actions show pending/success/error states.

## T12 — Utility records backend

**Blueprint references:** Sections 5.5, 8 and 11.6.

**Scope:** Implement utility record create/list/read/update/delete operations, allowed resource/unit validation, month uniqueness, canonical unit conversion and optional bill amount/document reference.

**Acceptance:** electricity is stored as kWh, water as m³ and fuel as L; duplicate organisation/resource/month is handled clearly; invalid quantity/unit/month is rejected; every query is organisation-scoped; CRUD integration tests pass.

## T13 — Utility records frontend

**Blueprint references:** Section 5.5 Utility records.

**Scope:** Implement the utility records tab, table, filters, create/edit form, document link selector and delete confirmation using the T12 API.

**Acceptance:** utility records can be created, edited, listed and deleted through the UI; filters work; form validation mirrors server rules; queries refresh after mutations; no sample records appear in a real account.

## T14 — Production records backend and frontend

**Blueprint references:** Sections 5.5 and 11.7.

**Scope:** Implement one production record per organisation/month, unit inherited from organisation settings, CRUD API and the matching UI.

**Acceptance:** production records persist; duplicate months are handled; production unit is not silently reinterpreted; deleting a record warns about the impact on intensity; organisation isolation tests pass.

## T15 — Deterministic calculation engine

**Blueprint references:** Sections 9 and 16.

**Scope:** Implement pure/testable calculation functions for totals, production-normalised intensity, comparable-period changes, partial spend coverage and the transparent observed-improvement/potential-savings calculations defined in the blueprint. Keep calculations separate from API routes.

**Acceptance:** use `Decimal`; unit tests pass against every expected value in Section 16; missing production produces null intensity; missing amounts remain missing/partial; no LLM call is used for numeric calculations.

## T16 — Dashboard API

**Blueprint references:** Sections 5.4 and 11.8.

**Scope:** Implement the dashboard summary endpoint using persisted records and the T15 calculation service. Include data coverage, latest insight/actions counts only if those resources already exist by this point.

**Acceptance:** response contains only calculated database values; empty account returns empty/null metrics not fake zeros; month handling is tested; organisation isolation is tested; API schema is documented.

## T17 — Dashboard frontend

**Blueprint references:** Section 5.4.

**Scope:** Wire dashboard KPI cards, month selector, resource chart filter, Add Data navigation, Generate Insights only if T18 exists, and links to relevant pages. Use the dashboard API.

**Acceptance:** all metrics are API-backed; empty and partial-data states are accurate; loading and error states work; changing month refetches data; no fabricated values or non-functional buttons.

## T18 — Analytics API and calculation presentation contract

**Blueprint references:** Sections 5.6, 9 and 11.8.

**Scope:** Implement analytics query filters and response shape for date range, resource, metric, monthly series and gaps. Reuse T15 calculations.

**Acceptance:** date range validation works; missing months remain gaps; missing production yields null intensity; only available spend is included; cross-organisation access is impossible; tests cover range and resource filters.

## T19 — Analytics frontend

**Blueprint references:** Section 5.6.

**Scope:** Implement analytics filters, Recharts visualisations, summary table, legend toggles, reset filters and CSV export only if the matching report endpoint is implemented. Do not add extra charts or metric types.

**Acceptance:** charts are based only on API response; empty states and gaps are honest; filters work; chart labels include units; keyboard-accessible filters work; responsive layout passes.

## T20 — Rules-based insights engine

**Blueprint references:** Sections 5.7, 10.1–10.3 and 11.9.

**Scope:** Implement deterministic insight rules and recommendation templates from the blueprint. Add insight generate/list endpoints and idempotent generation for the same organisation/month/rule version.

**Acceptance:** insights only appear when required data is available; each insight shows source, period, observed facts and caveat; duplicate generation does not create duplicate rows; deterministic tests pass; no LLM dependency is required.

## T21 — Optional AI explanation adapter and consent

**Blueprint references:** Sections 10.4–10.5, 5.11 and 19.

**Scope:** Implement the optional server-side LLM provider adapter only after T20 works. Enforce organisation consent, aggregated non-identifying input, structured output validation, timeout and rules-only fallback.

**Acceptance:** default consent is false; no raw invoices or PII are sent; missing key/provider error/malformed JSON returns rules-based output; numeric fields remain backend-calculated; tests prove the fallback path.

## T22 — Recommendations UI and action creation API

**Blueprint references:** Sections 5.8 and 11.9.

**Scope:** Implement recommendations list/filter, details, accept/dismiss endpoints and UI. Accept must create exactly one linked action transactionally and be idempotent.

**Acceptance:** accepting twice does not create duplicate actions; dismiss status persists; priority/status filters work; pending/success/error feedback exists; recommendation-to-action relationship is correct.

## T23 — Action tracker

**Blueprint references:** Sections 5.9 and 11.10.

**Scope:** Implement manual action CRUD, linked actions, status transitions, due-date/status filters and the Action Tracker UI.

**Acceptance:** pending/in-progress/completed/cancelled transitions follow the blueprint; server sets completion timestamp; reopening behaviour is consistent; delete requires confirmation; completed actions do not automatically claim achieved savings.

## T24 — Reports and CSV export

**Blueprint references:** Sections 5.10 and 11.11.

**Scope:** Implement monthly report API, CSV exports and print-friendly report UI. Include units, generated timestamp, selected month, data completeness and caveats.

**Acceptance:** report matches database records and T15 calculations; CSV protects against formula injection; missing data is disclosed; print action uses browser print; no fake PDF server endpoint or certification claim.

## T25 — End-to-end, security and release verification

**Blueprint references:** Sections 17, 19 and 20.

**Scope:** Add/run the critical Playwright journey: register → enter records → dashboard → analytics → generate insight → accept recommendation → complete action → report. Review organisation isolation, secrets, uploads, CORS, validation and error handling.

**Acceptance:** all relevant CI checks pass; no dead buttons or fake account metrics; two-account isolation tests pass; no critical/high security issue remains; all remaining known limitations are listed honestly. Do not deploy in this task.

## T26 — Production deployment preparation

**Blueprint references:** Sections 18 and 20.

**Scope:** Prepare and verify configuration for Supabase, Render and Vercel: environment-variable names, CORS origins, health-check path, migration command, build/start commands, Vercel SPA rewrite, storage bucket policy and deployment checklist. Do not access production secrets or deploy without approval.

**Acceptance:** README and deployment checklist contain exact steps; environment variable names match code; frontend build and backend tests pass; no secret is committed; migration and rollback commands are documented.

## T27 — Deploy only after explicit approval

**Blueprint references:** Sections 18 and 20.

**Scope:** Perform only the deployment steps the user explicitly authorises. The user must create/own provider accounts and supply secrets through provider dashboards, not chat. Never ask the user to paste secrets into source code or commit them.

**Acceptance:** Supabase schema/storage configuration verified; Render health endpoint responds; Vercel site loads; production CORS works; register/login/record creation/dashboard/report smoke tests pass on live URLs; deployment is called successful only after these checks.

---

# 6. Standard task execution message

Use this message when authorising any one task. Replace `TXX` with the exact task ID.

```text
APPROVE TXX.

Execute only TXX from Section 5 of SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md.
Before editing, inspect the relevant files and list the exact files you expect to change. Follow the blueprint and all backend/frontend safety rules. Do not begin any other task or add scope.

After implementation, run the task's acceptance checks and all relevant lint/typecheck/test/build checks. Inspect the diff for unrelated edits, secrets, dead buttons, fake data and organisation-scope mistakes.

Return the required task report. If blocked, stop and explain the blocker. Do not continue to the next task. Wait for my next approval.
```

# 7. Standard bug-fix message

```text
FIX TXX ONLY.

The issue is: <paste exact error or failing behaviour>.
Reproduce it first. Inspect the smallest relevant code path. Fix only the cause of this issue within TXX. Do not refactor unrelated files, change architecture, add features or continue to another task.
Add or correct a regression test. Run the relevant checks and report exact commands/results. Stop after the fix.
```

# 8. Standard code-review message before approving the next task

```text
Review the implementation of TXX only; do not edit files yet.
Compare the diff against both specification files. Check for scope creep, missing acceptance criteria, dead buttons, fake data, insecure organisation queries, frontend secrets, incorrect Decimal/unit handling, missing error states, unnecessary dependencies and untested failure paths.
Return findings grouped by Critical / High / Medium / Low, with exact file and line references. If no issue is found, say so, but do not start the next task.
```

# 9. Release rules — no shortcuts

Before calling the MVP ready, confirm all of the following:

- [ ] A fresh local setup works from documented commands.
- [ ] A fresh PostgreSQL database can be migrated using Alembic.
- [ ] Registration, login and logout work with real backend persistence.
- [ ] A user cannot access another organisation's records or documents.
- [ ] Utility and production records can be created, edited, listed and deleted.
- [ ] Uploaded files are private and ownership-checked.
- [ ] Dashboard and analytics contain only database-backed values.
- [ ] Calculation tests match the blueprint's expected dataset.
- [ ] Rules-based insights work with no AI key configured.
- [ ] External AI is opt-in and has a tested fallback.
- [ ] Recommendation acceptance does not create duplicate actions.
- [ ] Action status and report flows work end to end.
- [ ] Every displayed button/link has a real, tested behaviour.
- [ ] Loading, empty, missing-data and failure states are implemented.
- [ ] Frontend lint, typecheck, tests and production build pass.
- [ ] Backend lint, tests and migration checks pass.
- [ ] E2E smoke journey passes.
- [ ] Secrets are not present in Git history, frontend bundles, logs or screenshots.
- [ ] Production Vercel/Render/Supabase configuration is verified.
- [ ] Live deployment smoke tests pass before claiming release success.

**Final instruction:** Build the smallest correct SYNERGYX MVP described in the blueprint. Work one task at a time. Do not surprise the user with extra code, architecture, features or deployment actions. Correctness, traceability, security and a repeatable deployment are more important than speed or visual extras.
