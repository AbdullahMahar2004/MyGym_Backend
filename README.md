# MyGym_Backend

MyGym_Backend is a robust backend API for managing gym memberships, plans, trainers, notifications, and user authentication. Built with ASP.NET Core 9, Entity Framework Core, and JWT authentication, it provides a secure and extensible foundation for gym management systems.

---

## Features

- **User Authentication & Authorization:**  
  - Register, verify, and login with JWT tokens  
  - Role-based access for Admin and Member

- **Member Management:**  
  - Add, update, freeze/unfreeze, renew, and delete members  
  - Track sessions, plans, and trainers

- **Plan & Trainer Management:**  
  - CRUD operations for plans and trainers  
  - Assign plans and trainers to members

- **Notifications:**  
  - Automatic and manual notifications for users (e.g., plan expiry, new plans)

- **Admin & Member APIs:**  
  - Separate endpoints for admin and member operations

---

## Tech Stack

- **.NET 9 / ASP.NET Core**
- **Entity Framework Core** (SQLite)
- **JWT Authentication**
- **ASP.NET Identity**
- **Postman** (in development mode)

---

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [SQLite](https://www.sqlite.org/download.html) (default DB)
- [Visual Studio Code](https://code.visualstudio.com/) or Visual Studio

### Setup

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd MyGym_Backend
   ```

2. **Restore dependencies:**
   ```sh
   dotnet restore
   ```

3. **Apply database migrations:**
   ```sh
   dotnet ef database update
   ```

4. **Run the application:**
   ```sh
   dotnet run
   ```

5. **API Documentation:**  
   Open [http://localhost:\<port\>/swagger](http://localhost:<port>/swagger) (if in development mode).

---

## Project Structure

```
MyGym_Backend/
│
├── controllers/         # API Controllers (Admin, Auth, Member, Plan, Trainer)
├── data/                # DbContext and SeedData
├── DTO/                 # Data Transfer Objects
├── Modals/              # Entity Models (Member, Plan, Trainer, etc.)
├── Repositories/        # Repository interfaces and implementations
├── Services/            # Notification service and interface
├── Migrations/          # EF Core migrations
├── appsettings.json     # Configuration (JWT, DB, Logging)
├── Program.cs           # Application entry point
└── ...
```

---

## API Overview

### Authentication

- `POST /api/auth/register` — Register user (requires email to be pre-registered as a member)
- `POST /api/auth/verify` — Verify registration with code
- `POST /api/auth/login` — Login and receive JWT

### Admin Endpoints

- `GET /api/admin` — List all members
- `POST /api/admin` — Add a new member
- `PUT /api/admin/{id}/update` — Update member info
- `PUT /api/admin/{id}/Freeze` — Freeze a member
- `PUT /api/admin/{id}/Unfreeze` — Unfreeze a member
- `PUT /api/admin/{id}/Renew` — Renew a member's plan
- `PUT /api/admin/{id}/update-session-count` — Update session count
- `DELETE /api/admin/{id}` — Delete a member

### Member Endpoints

- `GET /api/member/{id}` — Get member info (self)
- `GET /api/member/plans` — List available plans
- `GET /api/member/trainers` — List available trainers
- `PUT /api/member/{id}/renew` — Renew own plan
- `PUT /api/member/{id}/freeze` — Freeze own membership
- `PUT /api/member/{id}/unfreeze` — Unfreeze own membership

### Plan & Trainer Endpoints (Admin only)

- `GET /api/plan` — List all plans
- `POST /api/plan` — Add a new plan
- `PUT /api/plan/{id}` — Update plan price
- `DELETE /api/plan/{id}` — Delete a plan

- `GET /api/trainer` — List all trainers
- `POST /api/trainer` — Add a new trainer

---

## Configuration

- **Database:**  
  Uses SQLite by default (`Data Source=MyGym.db`).  
  Change connection string in [`appsettings.json`](appsettings.json).

- **JWT:**  
  Set your JWT key, issuer, and audience in [`appsettings.json`](appsettings.json).

---

## Seeding

On first run, an admin user is seeded:
- **Email:** `admin@yourdomain.com`
- **Password:** `Admin!2345Secure`

---

## Testing

Add your tests in a `Tests/` directory and run:
```sh
dotnet test
```

---

## Notes

- Email verification codes are printed to the console (no SMTP integration).
- For production, update JWT secrets and consider using a real email service.

---
