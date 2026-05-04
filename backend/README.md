# PG Lead CRM — Backend

Production-grade FastAPI backend for the PG reservation Lead Management CRM.

---

## 🏗 Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, exception handlers
│   ├── core/
│   │   ├── config.py            # Pydantic settings (env-driven)
│   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   └── security.py          # JWT, password hashing, auth deps
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── lead.py              # Lead + LeadStatusHistory
│   │   ├── visit.py
│   │   └── activity.py
│   ├── schemas/                 # Pydantic I/O contracts
│   │   ├── user.py
│   │   ├── lead.py
│   │   ├── visit.py
│   │   ├── activity.py
│   │   ├── dashboard.py
│   │   └── common.py            # PaginatedResponse, MessageResponse
│   ├── api/v1/
│   │   ├── router.py            # Aggregates all sub-routers
│   │   └── endpoints/
│   │       ├── auth.py          # /auth/register, /auth/login, /auth/me
│   │       ├── users.py         # /users CRUD
│   │       ├── leads.py         # /leads CRUD + bulk ops
│   │       ├── pipeline.py      # /leads/{id}/status
│   │       ├── visits.py        # /visits + /visits/upcoming
│   │       ├── activities.py    # /activities
│   │       └── dashboard.py     # /dashboard/metrics|funnel|activity
│   ├── services/
│   │   ├── lead_service.py      # Core business logic
│   │   ├── scoring_service.py   # Lead score computation
│   │   ├── activity_service.py  # Activity logging hub
│   │   ├── visit_service.py
│   │   └── dashboard_service.py
│   └── utils/
│       ├── sla.py               # SLA breach detection
│       └── next_action.py       # Next-best-action engine
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial.py
├── seed.py                      # Realistic seed data (14 leads, 5 users)
├── alembic.ini
├── requirements.txt
└── .env.example
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 14+

### 2. Setup

```bash
cd backend

# Create venv
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env
# Edit .env: set DATABASE_URL, SECRET_KEY
```

### 3. Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE pg_crm;"

# Run migrations
alembic upgrade head

# Seed with realistic data
python seed.py
```

### 4. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- ReDoc:    http://localhost:8000/redoc
- Health:   http://localhost:8000/health

---

## 🔑 Authentication

All endpoints (except `/auth/*`) require a Bearer JWT.

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aarav@pgcrm.dev","password":"Admin@123"}'

# Use the token
curl http://localhost:8000/api/v1/leads \
  -H "Authorization: Bearer <token>"
```

**Seed credentials:**
| Role  | Email              | Password   |
|-------|--------------------|------------|
| Admin | aarav@pgcrm.dev    | Admin@123  |
| Agent | priya@pgcrm.dev    | Agent@123  |

---

## 📡 API Reference

### Auth
| Method | Path                | Description        |
|--------|---------------------|--------------------|
| POST   | /api/v1/auth/register | Register user     |
| POST   | /api/v1/auth/login  | Login → JWT        |
| GET    | /api/v1/auth/me     | Current user       |

### Leads
| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| POST   | /api/v1/leads               | Create lead (dup check + scoring)  |
| GET    | /api/v1/leads               | List with filters + pagination     |
| GET    | /api/v1/leads/{id}          | Get lead detail                    |
| PUT    | /api/v1/leads/{id}          | Update lead                        |
| DELETE | /api/v1/leads/{id}          | Delete (admin only)                |
| PATCH  | /api/v1/leads/{id}/assign   | Assign/unassign                    |
| PATCH  | /api/v1/leads/{id}/status   | Move pipeline stage                |
| POST   | /api/v1/leads/bulk/assign   | Bulk assign (admin only)           |
| POST   | /api/v1/leads/bulk/status   | Bulk status update (admin only)    |

**GET /leads query params:**
- `status` — New | Contacted | Interested | Visit Scheduled | Closed
- `assigned_to` — user id
- `search` — searches name, email, phone, location
- `overdue=true` — SLA-breached leads only
- `hot=true` — score ≥ 80
- `sort_by`, `sort_dir` — field + asc/desc
- `page`, `page_size`

### Visits
| Method | Path                    | Description               |
|--------|-------------------------|---------------------------|
| POST   | /api/v1/visits          | Schedule visit            |
| GET    | /api/v1/visits          | All visits                |
| GET    | /api/v1/visits/upcoming | Future visits             |

### Activities
| Method | Path                        | Description             |
|--------|-----------------------------|-------------------------|
| POST   | /api/v1/activities          | Log manual activity     |
| GET    | /api/v1/activities/{leadId} | Get lead activity feed  |

### Dashboard
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /api/v1/dashboard/metrics   | KPI cards                |
| GET    | /api/v1/dashboard/funnel    | Stage distribution       |
| GET    | /api/v1/dashboard/activity  | Activity + agent perf    |

---

## 🧠 Business Logic

### Lead Scoring (0–100)
| Factor          | Max Points | Logic                              |
|-----------------|------------|------------------------------------|
| Budget          | 40         | ₹25k+ = 40, ₹20k+ = 32, ...       |
| Activity Recency| 30         | <6h = 30, <24h = 24, <3d = 16 ... |
| Pipeline Stage  | 30         | Closed = 30, Visit = 25, ...       |

### Next-Best-Action Engine
Auto-suggests action when lead is created or status changes:
- `New` + score ≥ 70 → **call** in 2h
- `New` + low score → **call** in 6h
- `Contacted` → **follow-up** in 24h
- `Interested` → **visit** in 48h
- `Visit Scheduled` → **confirm** in 12h
- `Closed` → **send-info** in 72h

### SLA Tracking
| Status      | Threshold |
|-------------|-----------|
| New         | 24 hours  |
| Contacted   | 48 hours  |
| Interested  | 72 hours  |

Leads exceeding their threshold appear with `sla_breached: true` and in `/leads?overdue=true`.

### Auto Activity Logging
Every mutation automatically creates an activity record:
- Lead creation → `lead_created`
- Status change → `status_changed` + `LeadStatusHistory` row
- Assignment → `assigned`
- Visit scheduled → `visit_scheduled`
- Note update → `note_added`

### Duplicate Detection
Creating a lead with an existing email **or** phone returns `HTTP 409 Conflict`.

### Role-Based Access
- **Agents** only see and edit leads assigned to them
- **Admins** see all leads, can bulk-operate, delete leads, deactivate users

---

## 🔧 Connecting the Frontend

In your frontend's API layer, set:

```ts
const BASE_URL = "http://localhost:8000/api/v1";
```

Replace the in-memory `crmStore.tsx` calls with `fetch`/`axios` calls:
- `addLead(data)` → `POST /leads`
- `updateLead(id, patch)` → `PUT /leads/{id}`
- `setLeadStatus(id, status)` → `PATCH /leads/{id}/status`
- `assignLead(id, userId)` → `PATCH /leads/{id}/assign`
- `scheduleVisit(...)` → `POST /visits`
- `getLeadActivity(id)` → `GET /activities/{id}`
- Dashboard data → `GET /dashboard/metrics|funnel|activity`

---

## 🚀 Production Notes

- Set a strong `SECRET_KEY` (32+ random characters)
- Use `ENVIRONMENT=production` to suppress SQL echo
- Add a reverse proxy (nginx) with TLS
- Enable Redis for caching hot dashboard queries
- Scale with `uvicorn app.main:app --workers 4`
