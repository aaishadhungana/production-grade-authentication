# Production-Grade Authentication System

A complete and production ready **authentication & user management REST API** built with **Node.js**, **Express**, and **MongoDB**.

![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green?logo=mongodb)
![Jest](https://img.shields.io/badge/Tests-Jest-red?logo=jest)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)

---

## Features

| Feature | Details |
|---|---|
|  **JWT Auth** | Short-lived access tokens (15m) + long-lived refresh tokens (7d) |
|  **Token Rotation** | Refresh tokens are rotated on every use, reuse triggers full session revocation |
|  **RBAC** | Role-based access control with `user` and `admin` roles |
|  **OAuth 2.0** | Google and GitHub login via passport.js |
|  **Email Flows** | Verification on signup, password reset with expiring tokens |
|  **Security** | Helmet, CORS, rate limiting (4 tiers), NoSQL injection prevention, XSS sanitization |
|  **Account Lockout** | Locks account for 30 min after 5 failed login attempts |
|  **Swagger Docs** | Full OpenAPI 3.0 docs at `/api/docs` |
|  **Docker** | Multi-stage Dockerfile + docker-compose for one-command startup |
|  **Tests** | 60+ unit & integration tests with MongoDB in-memory server |

---

## Overall Project Structure

```
auth-system/
├── server.js                        # App entry point + shutdown
├── src/
│   ├── app.js                       # Express setup + global middleware
│   ├── config/
│   │   ├── db.js                    # MongoDB connection with reconnect
│   │   ├── passport.js              # JWT + Google + GitHub strategies
│   │   └── swagger.js               # OpenAPI 3.0 spec
│   ├── models/
│   │   ├── user.model.js            # User schema with bcrypt + methods
│   │   └── token.model.js           # Refresh token with TTL auto-expiry
│   ├── services/
│   │   ├── auth.service.js          # Core auth business logic
│   │   ├── token.service.js         # Token generation, rotation, revocation
│   │   └── email.service.js         # Nodemailer + HTML email templates
│   ├── controllers/
│   │   ├── auth.controller.js       # Auth HTTP handlers
│   │   └── user.controller.js       # User CRUD HTTP handlers
│   ├── routes/
│   │   ├── index.js                 # Route aggregator
│   │   ├── auth.routes.js           # /api/v1/auth/* + Swagger JSDoc
│   │   └── user.routes.js           # /api/v1/users/* + Swagger JSDoc
│   ├── middlewares/
│   │   ├── auth.middleware.js       # JWT authenticate guard
│   │   ├── role.middleware.js       # authorize("admin") RBAC guard
│   │   ├── rateLimiter.middleware.js # Global / auth / reset / resend limiters
│   │   └── error.middleware.js      # Centralized error handler
│   ├── validators/
│   │   ├── auth.validator.js        # express-validator rules
│   │   └── user.validator.js        # Profile / admin update rules
│   └── utils/
│       ├── apierror.js              # Custom error class with static helpers
│       ├── apiresponse.js           # Standardized JSON response wrapper
│       ├── catchasync.js            # Async route wrapper (no try-catch needed)
│       └── logger.js                # Winston logger (console + file)
├── tests/
│   ├── globalsetup.js               # Boots in-memory MongoDB for all tests
│   ├── globalteardown.js            # Tears down after all tests
│   ├── setuptests.js                # Suppresses logger noise in tests
│   ├── helpers.js                   # createTestUser / createTestAdmin factories
│   ├── unit/
│   │   ├── user.model.test.js       # Model validation + methods
│   │   └── token.service.test.js    # Token generation + rotation logic
│   └── integration/
│       ├── auth.routes.test.js      # Full HTTP auth endpoint coverage
│       └── user.routes.test.js      # Full HTTP user endpoint coverage
├── scripts/
│   ├── seed.js                      # Create default admin user
│   ├── generatesecrets.js           # Generate JWT secrets
│   └── mongo-init.js                # MongoDB Docker init script
├── Dockerfile                       # Multi-stage production image
├── docker-compose.yml               # API + MongoDB stack
├── docker-compose.dev.yml           # Dev overrides (nodemon + volume mount)
├── .env.example                     # Environment variable template
```

---

## Quick Start

### Option A: Local Development

**Prerequisites:** Node.js 18+, MongoDB running locally

```bash
# 1. Clone & install
git clone https://github.com/aaishadhu/production-grade-authentication.git
cd auth-system
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Generate JWT secrets
node scripts/generateSecrets.js
# Copy the output into your .env

# 4. Seed an admin user 
node scripts/seed.js

# 5. Start dev server 
npm run dev
```

### Option B: Docker 

```bash
cp .env.example .env
# Edit .env (SMTP, OAuth keys, etc.)

# Start everything (API + MongoDB)
docker compose up --build

# With Mongo Express UI at http://localhost:8081
docker compose --profile dev up --build
```

The API will be available at **`http://localhost:5000`**
Swagger docs at **`http://localhost:5000/api/docs`**

---

## API Endpoints

### Auth: `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | ❌ | Register new user |
| `POST` | `/login` | ❌ | Login, returns tokens |
| `POST` | `/refresh-token` | ❌ | Rotate refresh token |
| `POST` | `/logout` | ✅ | Revoke refresh token |
| `POST` | `/logout-all` | ✅ | Revoke all sessions |
| `GET` | `/verify-email/:token` | ❌ | Verify email address |
| `POST` | `/resend-verification` | ❌ | Resend verification email |
| `POST` | `/forgot-password` | ❌ | Send reset email |
| `POST` | `/reset-password` | ❌ | Reset with token |
| `POST` | `/change-password` | ✅ | Change password |
| `GET` | `/google` | ❌ | Initiate Google OAuth |
| `GET` | `/github` | ❌ | Initiate GitHub OAuth |

### Users: `/api/v1/users`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/me` | ✅ | Any | Get own profile |
| `PATCH` | `/me` | ✅ | Any | Update own profile |
| `DELETE` | `/me` | ✅ | Any | Deactivate own account |
| `GET` | `/` | ✅ | Admin | List all users (paginated) |
| `GET` | `/:id` | ✅ | Admin | Get user by ID |
| `PATCH` | `/:id/role` | ✅ | Admin | Update user role |
| `PATCH` | `/:id/status` | ✅ | Admin | Activate/deactivate |
| `DELETE` | `/:id` | ✅ | Admin | Hard delete user |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/docs` | Swagger UI |

---

## Authentication Flow

### Standard Login
```
Client                          Server
  │                               │
  ├─── POST /auth/login ─────────>│
  │                               ├── Validate credentials
  │                               ├── Check account lock
  │                               ├── Generate accessToken (15m JWT)
  │                               ├── Generate refreshToken (random, stored in DB)
  │<── { accessToken, refreshToken } ─┤
  │                               │
  ├─── GET /api/protected ───────>│
  │    Bearer: accessToken        ├── Verify JWT signature + expiry
  │<── 200 OK ─────────────────── │
  │                               │
  ├─── POST /auth/refresh-token ─>│  (when accessToken expires)
  │    { refreshToken }           ├── Look up token in DB
  │                               ├── Validate: not revoked, not expired
  │                               ├── Revoke old token (rotation)
  │                               ├── Issue new accessToken + refreshToken
  │<── { accessToken, refreshToken } ─┤
```

### Token Rotation & Theft Detection
- Every `/refresh-token` call **revokes the old token** and issues a new one
- If a **revoked token** is reused → all sessions for that user are immediately revoked
- Refresh tokens store `userAgent` and `ipAddress` for audit purposes
- MongoDB TTL index auto-deletes expired token documents

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/auth_system

JWT_ACCESS_SECRET=<run: node scripts/generateSecrets.js>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (use https://ethereal.email for dev)
SMTP_HOST=smtp.ethereal.email
SMTP_USER=...
SMTP_PASS=...

# OAuth (optional and app works without them)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## OAuth Setup

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (Web Application)
4. Add Authorized redirect URI: `http://localhost:5000/api/v1/auth/google/callback`
5. Copy Client ID + Secret to `.env`

### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Set Homepage URL: `http://localhost:5000`
3. Set Callback URL: `http://localhost:5000/api/v1/auth/github/callback`
4. Copy Client ID + Secret to `.env`

---

## Testing

```bash
npm test                  # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Coverage report (HTML in ./coverage)
```

---

## Security Checklist

- [x] Passwords hashed with **bcrypt** (12 rounds)
- [x] JWT secrets are environment variables (never hardcoded)
- [x] Refresh tokens stored in DB, not client-side only
- [x] Token rotation on every refresh
- [x] Stolen token detection → full session revocation
- [x] Account lockout after 5 failed attempts (30 min)
- [x] Rate limiting on all sensitive endpoints
- [x] `helmet` sets 15 security HTTP headers
- [x] `express-mongo-sanitize` blocks NoSQL injection
- [x] `xss-clean` sanitizes user input
- [x] Password reset tokens are **hashed** in DB (raw token only in email)
- [x] Email enumeration prevention on forgot-password
- [x] Sensitive fields stripped from all API responses
- [x] Docker container runs as **non-root** user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Auth | Passport.js, JWT, bcrypt |
| Validation | express-validator |
| Email | Nodemailer |
| Docs | Swagger / OpenAPI 3.0 |
| Logging | Winston |
| Testing | Jest + Supertest + mongodb-memory-server |
| Security | Helmet, CORS, express-rate-limit, xss-clean |
| DevOps | Docker, docker-compose |

---
## Author
Aaisha Dhungana
> Built as a production-grade reference project.
