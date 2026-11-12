# SYNERGYX — Industrial Resource Intelligence Platform

SYNERGYX is an industrial resource intelligence platform designed for owners and managers of small-to-medium manufacturing enterprises (SMEs). It enables facilities to track monthly electricity, water, fuel, and production records, compute production-normalized intensity, surface deterministic evidence-based insights, track practical operational actions, and transparently measure performance over time.

---

## 1. Locked Technology Stack

* **Frontend**: React 18 / 19, TypeScript, Vite, React Router v6, TanStack Query v5, React Hook Form, Zod, Recharts, Lucide React, Framer Motion.
* **Backend**: Python 3.12+ (compatible up to 3.14), FastAPI, Pydantic v2, SQLAlchemy 2.x (synchronous), Alembic, PostgreSQL.
* **Database & File Storage**: Supabase-hosted PostgreSQL, Supabase Storage private bucket (production); local storage adapter (development).
* **Security & Auth**: Argon2 password hashing (`pwdlib[argon2]`), short-lived JWT bearer tokens (`PyJWT`).
* **Hosting**: Vercel (frontend SPA), Render (FastAPI web service), Supabase (PostgreSQL & Storage).

---

## 2. Repository Layout

```text
synergyx/
├── SYNERGYX_MVP_BLUEPRINT.md            # Master product & engineering specification
├── SYNERGYX_AI_AGENT_EXECUTION_PROMPT.md# Execution workflow and small-task queue
├── AGENTS.md                            # Non-negotiable engineering rules for coding agents
├── README.md                            # Project overview and run guide
├── .gitignore                           # Git ignore rules for node, python, secrets
├── .editorconfig                        # Code style and indentation rules
├── docker-compose.yml                   # Local PostgreSQL service (optional)
├── frontend/                            # Vite React TypeScript frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
└── backend/                             # FastAPI Python backend
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── alembic.ini
    ├── .env.example
    └── app/
```

---

## 3. Local Development Prerequisites

* **Node.js**: v20+ / v22+ LTS (Host has `v24.16.0` and `npm 11.14.1`)
* **Python**: 3.12+ (Host has `3.14.0`)
* **Git**: Installed
* **PostgreSQL**: Local PostgreSQL 16+ or Supabase instance

---

## 4. Getting Started

### Backend Setup

```bash
cd backend
py -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

---

## 5. Engineering Principles & Safety

1. **Deterministic Numbers**: Authoritative calculations (resource intensity, month-over-month deltas, potential savings) are computed strictly in Python with `Decimal`. LLMs never calculate numeric values.
2. **Tenant Isolation**: Every database query and storage access is strictly scoped to the authenticated user's `organization_id`.
3. **No Dead Buttons or Fake Data**: Every UI control performs a real, implemented action or is disabled/omitted. No demo metrics are injected into real accounts.
4. **Private Document Storage**: Uploaded bills are stored in private storage buckets; download access is via short-lived signed URLs after ownership validation.
