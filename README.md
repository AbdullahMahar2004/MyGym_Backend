# MyGym

Full-stack gym management system — Node.js microservices backend + React frontend.

---

## Project Structure

```
MyGym/
├── backend/          Node.js microservices (API Gateway + 5 services)
└── frontend/         React app (Vite)
```

## Tech Stack

**Backend:** Node.js · Express · Prisma · SQLite · JWT · bcryptjs · node-cron  
**Frontend:** React · Vite · React Router · Axios

---

## Microservices

| Service | Port | Responsibility |
|---|---|---|
| API Gateway | 3000 | JWT validation, role enforcement, request routing |
| Auth Service | 3001 | Register, verify email code, login |
| Member Service | 3002 | CRUD, freeze/unfreeze, renew, session count |
| Plan Service | 3003 | Plan CRUD, broadcast notifications |
| Trainer Service | 3004 | Trainer CRUD |
| Notification Service | 3005 | Send/read notifications, daily expiry cron job |

---

## Getting Started

### Backend

```bash
cd backend

# First time only
cp .env.example .env          # fill in JWT_SECRET
npm install
npx prisma db push --schema=schema.prisma
node prisma/seed.js           # seeds admin user

# Start all services
bash start.sh
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # → http://localhost:5173
```

---

## Default credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@yourdomain.com | Admin!2345Secure |

---

## API Overview

All requests go through the gateway at `http://localhost:3000`.

### Authentication (public)
- `POST /api/auth/register` — send verification code (email must be pre-registered as a member)
- `POST /api/auth/verify` — verify code, create account
- `POST /api/auth/login` — returns JWT + memberId

### Admin endpoints (Bearer token, Admin role)
- `GET /api/admin` — list all members
- `POST /api/admin` — add member
- `GET /api/admin/:id` — get member
- `PUT /api/admin/:id/update` — update member
- `PUT /api/admin/:id/Freeze` — freeze member
- `PUT /api/admin/:id/Unfreeze` — unfreeze member
- `PUT /api/admin/:id/Renew` — renew member plan
- `PUT /api/admin/:id/update-session-count` — mark a session used
- `DELETE /api/admin/:id` — delete member
- `GET/POST /api/plan` — list / create plans
- `PUT/DELETE /api/plan/:id` — update price / delete plan
- `GET/POST /api/trainer` — list / add trainers

### Member endpoints (Bearer token, Member role)
- `GET /api/member/:id` — own profile
- `GET /api/member/plans` — available plans
- `GET /api/member/trainers` — available trainers
- `PUT /api/member/:id/renew` — renew own plan
- `PUT /api/member/:id/freeze` — freeze own membership
- `PUT /api/member/:id/unfreeze` — unfreeze own membership
- `GET /api/notifications/:userId` — own notifications

---

## Notes

- Email verification codes are printed to the console (no SMTP in dev).
- Freeze limit: max 1/3 of plan duration; not allowed for sessional plans.
- Trainer assignment adds 30% to the plan price.
- Notification service runs a daily cron job at midnight to notify expired members.
