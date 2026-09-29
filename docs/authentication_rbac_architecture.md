# Phase 6 — Authentication, JWT & Role-Based Access Control Architecture

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Framework**: FastAPI, PyJWT, Argon2-cffi, React 19, Axios  
**Database**: MySQL 8.0 (`crime_management_db`) — Frozen `users` and `audit_logs` Tables  

---

## 1. Architectural Workflow

```text
React Frontend
      │ POST /api/v1/auth/login { username_or_email, password }
      ▼
FastAPI Auth Router (`backend/app/api/v1/auth.py`)
      │
      ▼
Authentication Service (`backend/app/services/auth_service.py`)
      │ User Lookup by username or email
      ▼
User Repository (`backend/app/repositories/user_repository.py`)
      │
      ▼ Argon2id Cryptographic Verification
Security Engine (`backend/app/core/security.py`)
      │
      ├──> On Failure: Log LOGIN_FAILURE → Raise Generic 401 Unauthorized
      ├──> On Inactive: Log LOGIN_INACTIVE → Raise 403 Forbidden
      └──> On Success:
              │
              ├──> Update users.last_login_at in MySQL
              ├──> Log LOGIN_SUCCESS to audit_logs
              └──> Generate HS256 JWT Token with sub=user_id, role=user_role
                      │
                      ▼ HTTP 200 OK
Response: { access_token, token_type: "bearer", user: { id, username, email, full_name, role } }
```

---

## 2. Password Security Specifications

- **Algorithm**: **Argon2id** (OWASP Password Hashing Competition Winner & Top Recommendation).
- **Parameters**:
  - `time_cost`: `3`
  - `memory_cost`: `65,536 KiB` (64 MiB)
  - `parallelism`: `4`
  - `hash_len`: `32`
  - `salt_len`: `16`
- **Hygiene & Data Isolation**:
  - Plaintext passwords are never logged, stored, or exposed in any API response or error trace.
  - The frozen `users.password_hash` column stores exclusively valid Argon2id hash strings (`$argon2id$v=19$m=65536,t=3,p=4$...`).

---

## 3. JWT Token Architecture

- **Algorithm**: `HS256` (HMAC with SHA-256)
- **Secret Key**: Configured via `JWT_SECRET_KEY` in environment / settings.
- **Expiration**: Configured via `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default: 60 minutes).
- **Token Claims**:
  ```json
  {
    "sub": "1",
    "role": "ADMIN",
    "iat": 1790680000,
    "exp": 1790683600
  }
  ```
- **Transmission**: Standard HTTP `Authorization: Bearer <token>` header, automatically injected via Axios request interceptors.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Security Role | Clearance Level | Operational Scope |
| :--- | :---: | :--- |
| **`ADMIN`** | Tier 1 (Root) | Full system administration, audit log inspection, ML pipeline configuration, budget allocation, resource management. |
| **`ANALYST`** | Tier 2 (Intelligence) | Longitudinal crime analytics, diurnal patrol curves, demographic profiling, risk ranking, report generation. |
| **`OFFICER`** | Tier 3 (Field Ops) | Field incident reporting, shift duty verification, localized district crime alerts. |

### FastAPI Dependencies
- `get_current_user`: Validates token and checks `is_active == True`.
- `require_roles(["ADMIN"])`: Enforces Administrator clearance.
- `require_roles(["ADMIN", "ANALYST"])`: Enforces Crime Analyst or Admin clearance.
- `require_roles(["ADMIN", "OFFICER"])`: Enforces Field Officer or Admin clearance.

---

## 5. REST API Endpoints

### 5.1. User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "username_or_email": "admin",
    "password": "Admin@12345"
  }
  ```
- **Success Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@crimeops.gov.in",
      "full_name": "Chief System Administrator",
      "role": "ADMIN",
      "is_active": true,
      "last_login_at": "2026-09-29T10:09:10",
      "created_at": "2026-09-29T10:08:45"
    }
  }
  ```
- **Failure Responses**:
  - Invalid Credentials / Missing User: `401 Unauthorized` &rarr; `{"detail": "Invalid username/email or password."}` (Anti-enumeration compliant).
  - Suspended User: `403 Forbidden` &rarr; `{"detail": "Account is inactive. Please contact an administrator."}`.

### 5.2. Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Returns authenticated user profile without `password_hash`.

### 5.3. User Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Action**: Injects `LOGOUT` record into `audit_logs` table.

---

## 6. Seeded Test Credentials

Initial test users seeded via [`database/seed/seed_users.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/database/seed/seed_users.py):

| Username | Email | Role | Test Password | Status |
| :--- | :--- | :---: | :--- | :---: |
| `admin` | `admin@crimeops.gov.in` | `ADMIN` | `Admin@12345` | Active |
| `analyst` | `analyst@crimeops.gov.in` | `ANALYST` | `Analyst@12345` | Active |
| `officer` | `officer@crimeops.gov.in` | `OFFICER` | `Officer@12345` | Active |
| `inactive` | `inactive@crimeops.gov.in` | `OFFICER` | `Inactive@12345` | Inactive |

---

## 7. Frontend Integration

- **[`AuthContext`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/context/AuthContext.tsx)**: Global session provider with localStorage token persistence.
- **[`ProtectedRoute`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/auth/ProtectedRoute.tsx)**: Guards protected analytical modules.
- **[`LoginPage`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/LoginPage.tsx)**: Law enforcement security terminal with quick-fill demo role pills.
- **[`Header`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/layout/Header.tsx)**: Live display of user name, username, and role badge (`ADMIN`, `ANALYST`, `OFFICER`) with session termination button.
