# RequestFlow AI

A mini AI-powered customer request routing system

## Live Demo
- **Frontend:** https://request-flow-ai.vercel.app/
- **Backend API:** https://requestflow-ai.onrender.com/
- **Health Check:** https://requestflow-ai.onrender.com/health

---

## Features
- Customer request intake via REST API
- Async AI classification using background worker (BullMQ + Redis)
- Real-time admin dashboard updates via Socket.io
- JWT authentication for admin/agent access
- Full event timeline and audit log
- Internal notes system
- Request filtering by status, priority, and category
- Idempotency key support to prevent duplicate requests
- Failed classification handling without breaking request creation

---

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (Supabase)
- BullMQ + Redis (Upstash) for async queue
- Socket.io for realtime updates
- JWT + bcrypt for auth
- express-validator for input validation
- express-rate-limit for abuse protection

### Frontend
- React
- Socket.io-client
- Axios
- React Router

### Deployment
- Backend: Render
- Frontend: Vercel
- Database: Supabase
- Queue: Upstash Redis

---

## Architecture

```
Customer → POST /api/requests → Express API → Save to PostgreSQL
                                            → Enqueue job (BullMQ)
                                            → Return 201 immediately

BullMQ Worker → Mock AI Provider → Classify request
             → Update ai_classifications table
             → Update customer_requests status
             → Log request_event
             → Emit Socket.io event

Admin Dashboard ← Socket.io ← Server
               ← REST API (list, detail, status, notes)
```

---

## Database Schema

### users
Stores admin and agent accounts with hashed passwords.
- `id`, `email`, `password_hash`, `role`, `created_at`

### customer_requests
Stores the original customer message and current status.
- `id`, `message`, `source_channel`, `customer_name`, `customer_email`
- `status`, `category_snapshot`, `priority_snapshot`
- `idempotency_key`, `created_at`, `updated_at`

### ai_classifications
Stores AI output **separately** from the original request.
This allows retrying classification, switching providers, and keeping
the original request clean regardless of AI failures.
- `id`, `request_id`, `provider`, `category`, `priority`
- `summary`, `confidence`, `reason`, `raw_output`
- `error_message`, `status`, `created_at`

### request_events
Audit log of every state change in the system.
- `id`, `request_id`, `event_type`, `old_value`, `new_value`
- `actor_id`, `metadata`, `created_at`

### internal_notes
Admin/agent notes attached to a request.
- `id`, `request_id`, `author_id`, `body`, `created_at`

**Why AI output is stored separately:**
If AI classification fails, the request still exists and is accessible.
Different AI providers can be tried without touching the original data.
Classification history is preserved if retried multiple times.

---

## AI Workflow

The AI layer is designed as a replaceable module in `backend/src/services/ai/mockProvider.js`.

1. Request is saved and job is queued immediately
2. Worker picks up job with request ID
3. Mock AI provider classifies message by keyword matching
4. Returns structured output:

```json
{
  "category": "support",
  "priority": "high",
  "summary": "Customer cannot access dashboard after payment.",
  "confidence": 0.86,
  "reason": "Payment + login issue requires fast support response.",
  "routing_queue": "support-team"
}
```

5. Output stored in ai_classifications table
6. Request status updated to open
7. Socket.io event emitted to dashboard

**To swap to a real AI provider:** Replace `mockProvider.js` with
an OpenAI or Gemini adapter. No other code changes needed.

**Prompt injection safety:** User messages are treated as untrusted
data throughout the system. They are never interpolated into
SQL queries (parameterized queries used everywhere) and never
executed as code. If integrated with a real LLM, messages would
be passed as data content, not system instructions.

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash recommended)

### Steps

```bash
# Clone the repo
git clone https://github.com/AlexTPaul/RequestFlow_AI.git
cd RequestFlow_AI

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Backend Environment Variables

Create `backend/.env`:
```
PORT=3001
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_secret_key
REDIS_URL=your_upstash_redis_url
NODE_ENV=development
```

### Frontend Environment Variables

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

### Run Database Migrations

Run the SQL scripts in `backend/src/db/schema.sql` in your
Supabase SQL editor to create all tables and indexes.

### Start the App

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Open `http://localhost:3000`

### Create Admin Account

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123","role":"admin"}'
```

---

## API Documentation

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Create admin/agent account | No |
| POST | /api/auth/login | Login and get JWT token | No |

### Requests
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/requests | Create request and queue AI job | No |
| GET | /api/requests | List requests with filters | Yes |
| GET | /api/requests/:id | Get full request detail | Yes |
| PATCH | /api/requests/:id/status | Update request status | Yes |
| POST | /api/requests/:id/notes | Add internal note | Yes |

---
