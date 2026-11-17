# SYNERGYX — Production Deployment Checklist & Runbook

This runbook guides the production release of SYNERGYX onto **Vercel** (Frontend SPA), **Render** (FastAPI Backend), and **Supabase** (PostgreSQL Database & Private Storage), following Sections 18, 19, and 20 of `SYNERGYX_MVP_BLUEPRINT.md`.

---

## 1. Architecture Overview

```mermaid
flowchart LR
    User[Client Browser] -->|HTTPS| Vercel[Vercel Frontend SPA\nVite + React + TS]
    Vercel -->|Bearer JWT API Calls| Render[Render Web Service\nFastAPI Python 3.12+]
    Render -->|SQLAlchemy Connection Pool| SupabaseDB[(Supabase PostgreSQL)]
    Render -->|Private Signed URLs 60-300s| SupabaseStore[(Supabase Storage\nutility-documents)]
```

---

## 2. Prerequisites & Accounts

1. **GitHub Repository**: Pushed and up-to-date with latest commits (`master` branch).
2. **Supabase Account**: Create at [supabase.com](https://supabase.com).
3. **Render Account**: Create at [render.com](https://render.com).
4. **Vercel Account**: Create at [vercel.com](https://vercel.com).

> [!IMPORTANT]
> **Zero Secrets in Code Policy**: Never enter production credentials or API keys into chat prompts or commit them to Git. All secrets must be entered directly in the respective provider dashboards.

---

## 3. Phase 1: Supabase Configuration (Database & Private Storage)

### 3.1 Database Setup
1. In Supabase Dashboard, click **New project**.
2. Select a project name (e.g. `synergyx-prod`), set a strong database password, and choose a region close to your primary users (e.g. `ap-south-1` Mumbai).
3. Under **Project Settings $\rightarrow$ Database $\rightarrow$ Connection parameters**:
   - Copy the connection URI.
   - For Render persistent connection pools, use the **Session Pooler** (or direct connection if IPv6 is supported).
   - Format connection URI using the psycopg driver:
     ```text
     postgresql+psycopg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
     ```
   - Ensure special characters in password are URL-encoded.

### 3.2 Private Storage Bucket Setup
1. In Supabase Dashboard, navigate to **Storage $\rightarrow$ Create new bucket**.
2. **Bucket Name**: `utility-documents`
3. **Privacy**: Toggle **Private bucket** to `ON` (unauthenticated public access is strictly disabled).
4. **Max file size**: Set to `10 MB`.
5. **Allowed MIME types**:
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
6. Under **Project Settings $\rightarrow$ API**:
   - Copy **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Copy **`service_role` secret key** (bypasses RLS for backend server-to-storage operations; strictly kept secret in backend only).

---

## 4. Phase 2: Render Backend Deployment

### 4.1 Create Web Service
1. In Render Dashboard, click **New $\rightarrow$ Web Service**.
2. Connect your GitHub repository: `SYNERGYX`.
3. Set configuration fields:
   - **Name**: `synergyx-backend`
   - **Region**: Same region as Supabase (e.g. `Singapore` / `Frankfurt`).
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Pre-Deploy Command**: *(Leave empty on Free tier; paid-only feature on Render)*
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan / Instance Type**: `Free` ($0/mo).

### 4.2 Health Check Configuration
Under **Advanced $\rightarrow$ Health Check Path**, set:
```text
/health/ready
```

### 4.3 Environment Variables Table
Add the following variables in the **Environment** tab:

| Variable Name | Production Value / Description | Sensitive? |
|---|---|---|
| `APP_ENV` | `production` | No |
| `APP_NAME` | `SYNERGYX API` | No |
| `API_V1_PREFIX` | `/api/v1` | No |
| `DATABASE_URL` | `postgresql+psycopg://postgres.[ref]:[pw]@[host]:5432/postgres` | **YES** |
| `JWT_SECRET_KEY` | *(Generate a 64-char random hex string via `openssl rand -hex 32`)* | **YES** |
| `JWT_ALGORITHM` | `HS256` | No |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | No |
| `JWT_ISSUER` | `synergyx-api` | No |
| `JWT_AUDIENCE` | `synergyx-client` | No |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` *(update once Vercel URL is known)* | No |
| `STORAGE_BACKEND` | `supabase` | No |
| `SUPABASE_URL` | `https://[project-ref].supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Paste Supabase service_role key)* | **YES** |
| `SUPABASE_STORAGE_BUCKET` | `utility-documents` | No |
| `AI_PROVIDER` | `rules` *(External AI remains disabled by default per blueprint)* | No |
| `OPENAI_API_KEY` | *(Leave empty until external AI is deliberately authorized)* | **YES** |
| `OPENAI_MODEL` | `gpt-4o-mini` *(optional)* | No |
| `AI_REQUEST_TIMEOUT_SECONDS` | `20` | No |
| `MAX_UPLOAD_SIZE_MB` | `10` | No |
| `LOG_LEVEL` | `INFO` | No |

### 4.4 Deploy & Verify Backend
1. Click **Create Web Service**.
2. Monitor build logs: verify dependencies install cleanly and `alembic upgrade head` applies all 9 tables.
3. Test public endpoints once deployed:
   - `https://synergyx-backend.onrender.com/health/live` $\rightarrow$ `{"status": "alive"}`
   - `https://synergyx-backend.onrender.com/health/ready` $\rightarrow$ `{"status": "ready", "database": "connected"}`

---

## 5. Phase 3: Vercel Frontend Deployment

### 5.1 Import Project
1. In Vercel Dashboard, click **Add New $\rightarrow$ Project**.
2. Select your GitHub repository: `SYNERGYX`.
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 5.2 Environment Variable
In the **Environment Variables** section, add:

| Name | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://synergyx-backend.onrender.com/api/v1` | Public backend API URL |

### 5.3 Single Page Application Routing Verification
Verify that `frontend/vercel.json` is present with the SPA rewrite:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This guarantees that direct navigation and browser refreshing on deep routes (e.g. `/app/dashboard`, `/app/records`, `/app/reports`) do not yield 404 errors.

### 5.4 Deploy & Link Domain
1. Click **Deploy**.
2. Copy the deployed domain URL (e.g. `https://synergyx-prod.vercel.app`).
3. Return to **Render Dashboard $\rightarrow$ Environment**:
   - Update `CORS_ORIGINS` to `https://synergyx-prod.vercel.app` (strictly no trailing slash).
   - Save changes to restart backend with the new CORS origin.

---

## 6. Phase 4: Production Smoke-Test Checklist

Perform these verification tests on the live production URL using a freshly registered test enterprise account:

- [ ] **Landing Page**: Loads securely over HTTPS with lavender enterprise styling.
- [ ] **Registration**: Register a new organization (`Acme Fab Ltd`, `textile`, `kg`, `Surat`).
- [ ] **Authentication**: Login returns JWT; profile displays correct user and organization details.
- [ ] **Navigation & SPA Deep Links**: Refreshing `/app/dashboard` and `/app/records` directly does not return a 404.
- [ ] **Utility Records**:
  - [ ] Create electricity record (10,500 kWh, ₹84,000).
  - [ ] Create water record (55,000 L $\rightarrow$ stored canonical as 55 m³).
  - [ ] Create fuel record (420 L, ₹42,000).
- [ ] **Production Record**: Enter monthly production (10,000 kg).
- [ ] **Private Storage Verification**:
  - [ ] Upload bill document (PDF).
  - [ ] Request download link: verify signed URL expires within 60–300s.
  - [ ] Attempt unauthenticated direct URL access: Supabase rejects with 403 Forbidden.
  - [ ] Attempt upload of forbidden `.exe` or spoofed magic bytes: API rejects.
- [ ] **Dashboard Verification**:
  - [ ] KPI cards render persisted values (no sample metrics).
  - [ ] Electricity Intensity displays `1.05 kWh/kg`.
  - [ ] Month-over-month observed reduction displays accurately if prior baseline exists.
- [ ] **Analytics Verification**:
  - [ ] Historical series chart renders with units and preserved unrecorded gaps.
  - [ ] "Export CSV" downloads valid RFC 4180 CSV.
- [ ] **Insights Engine**:
  - [ ] Click "Generate Insights": rules engine outputs deterministic insights with caveats.
  - [ ] Recommendation card shows practical step and calculable savings.
- [ ] **Action Tracker Lifecycle**:
  - [ ] Accept recommendation: creates exactly 1 linked action.
  - [ ] Click accept a second time: verify idempotency (no duplicate actions).
  - [ ] Change status to `in_progress`, then `completed`.
  - [ ] Server sets `completed_at` timestamp.
- [ ] **Performance Report**:
  - [ ] Generate monthly report: displays non-certified operational summary notice.
  - [ ] Click "Download CSV": verifies formula injection protection on text cells.
  - [ ] Click "Print / Save PDF": triggers native browser print dialog.
- [ ] **Multi-Tenant Isolation**:
  - [ ] Log in with a second distinct account.
  - [ ] Verify none of the first account's records, documents, or reports are visible.
- [ ] **Log Audit**: Check Render and Supabase logs to verify zero credentials, PII, or API keys were printed.

---

## 7. Rollback & Disaster Recovery Runbook

### 7.1 Database Backup & Restoration
- Supabase automatically takes daily backups.
- For manual backup before major migrations, use `pg_dump`:
  ```bash
  pg_dump "postgresql://postgres.[ref]:[pw]@[host]:5432/postgres" -F c -b -v -f synergyx_backup_pre_deploy.dump
  ```
- To restore:
  ```bash
  pg_restore -d "postgresql://postgres.[ref]:[pw]@[host]:5432/postgres" -v synergyx_backup_pre_deploy.dump
  ```

### 7.2 Database Migration Safety
- Never run `alembic downgrade` casually in production.
- Always write **additive migrations** (e.g. add nullable columns, backfill, then apply constraints in a subsequent release).
- If a schema issue arises, write and deploy a forward-fix migration.

### 7.3 Instant Render Web Service Rollback
1. Open Render Dashboard $\rightarrow$ Web Service $\rightarrow$ **Deploys**.
2. Locate the last known-healthy deploy.
3. Click **Rollback to this deploy**.

### 7.4 Instant Vercel Frontend Rollback
1. Open Vercel Dashboard $\rightarrow$ Project $\rightarrow$ **Deployments**.
2. Locate the previous production deployment.
3. Click the three dots $\rightarrow$ **Promote to Production** (instantly switches traffic in < 1s).
