# SYNERGYX — Non-Negotiable Agent Instructions

This document governs all AI coding agents working on the SYNERGYX codebase.

---

## 1. Source of Truth
* `SYNERGYX_MVP_BLUEPRINT.md` is the single source of truth for features, schemas, calculations, UI design tokens, and deployment.
* `SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md` governs task ordering, scope boundaries, and approval criteria.
* If a conflict exists between the two files, do not guess: stop and ask the user for clarification.

---

## 2. Strict Scope Control
* Work on strictly one task at a time.
* Do not introduce speculative abstractions, background worker frameworks (Celery/RQ), Redis, Kubernetes, payment systems, multi-user invitations/roles, IoT sensor integrations, or OCR.
* Every UI control must have a real backend-backed handler, disabled state, loading state, and error handling. No empty `onClick` handlers, no dead navigation links.
* Loading, empty, and error states must be honest. Never show hardcoded sample metrics as real account metrics.

---

## 3. Backend Rules
1. **Layered Architecture**: Route handler $\rightarrow$ Pydantic schema $\rightarrow$ Service/logic $\rightarrow$ SQLAlchemy model/session. Handlers in `main.py` or routers must remain thin.
2. **Session Lifecycle**: One explicit session lifecycle per request. Close sessions reliably and use database transactions for multi-write operations.
3. **Database Migrations**: Always use Alembic migrations. Never call `Base.metadata.create_all()` in production.
4. **Exact Decimal Precision**: Use PostgreSQL `NUMERIC` and Python `Decimal` for financial amounts, quantities, and intensities. Do not use binary floating point for authoritative metrics.
5. **Null vs Zero**: If data is missing, store and return `null` / `None`. Never silently coerce missing values to zero.
6. **Multi-Tenant Isolation**: Derivation of `organization_id` must come exclusively from the authenticated user session (via JWT `sub`). Never accept or trust `organization_id` from client request bodies or query parameters to authorize access.
7. **Storage Privacy**: Storage must remain private. Check file size (max 10MB), extension, and MIME type/magic bytes before upload. Stream or generate short-lived signed URLs (60–300s) after verifying tenant ownership.
8. **Deterministic Calculations & AI Safety**:
   * All numbers, sums, and intensities are calculated by pure Python services using `Decimal`.
   * LLMs are strictly optional, disabled by default, and require explicit organization consent.
   * Never send raw invoices, PII, names, emails, or precise locations to external AI. Send only consented, aggregated, non-identifying metric values.
   * If the external AI service fails, times out, or has no API key, the system must seamlessly fall back to rule-based insights.

---

## 4. Frontend Rules
1. **Shared Typed API Client**: All network requests pass through a centralized API client with typed errors (`ApiError`). Never communicate directly with PostgreSQL or Supabase with privileged keys from the client.
2. **State Management**: Use TanStack Query for server state and invalidate relevant query keys on mutations.
3. **Design Tokens**: Strictly use the lavender-light CSS tokens defined in Section 6 of the blueprint. Respect `prefers-reduced-motion`.
4. **Form Validation**: Use React Hook Form + Zod for client usability. The backend remains the authoritative validator.

---

## 5. Git & Secret Safety
* Never commit secrets, credentials, API keys, or `.env` files.
* Do not perform destructive database resets against production environments.
* Run all required lint, type-check, and test commands before declaring any task complete.
