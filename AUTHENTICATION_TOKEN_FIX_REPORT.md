# Root-Cause Investigation & Resolution Report: Authentication Token Handling

**System**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module**: Resource Optimization (`/resources`) & Universal Protected Intelligence Routes  
**Defect Addressed**: `"Optimization Error – Invalid or expired access token."`  
**Date**: November 11, 2026  
**Status**: Resolved, Built, and Verified (Production Ready)

---

## 1. Executive Summary

A browser error occurred on the Resource Optimization page:
```
"Optimization Error – Invalid or expired access token."
```
Upon investigation, this issue was identified as a systemic token lifecycle defect in the frontend application:
1. When a JWT access token expired (standard 60-minute duration) or became stale/invalid, the backend correctly returned `HTTP 401 Unauthorized` with detail `"Invalid or expired access token."`.
2. The Axios response interceptor in [`frontend/src/api/client.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/api/client.ts) intercepted the 401 error, formatted a message, and rejected the promise—**without clearing `localStorage.getItem('cms_access_token')`, without notifying `AuthContext`, and without redirecting to `/login`**.
3. Consequently, [`CrimeSpecificOptimizationView.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx) caught the error and rendered `<ErrorState title="Optimization Error" message="Invalid or expired access token." onRetry={...} />`. Clicking "Retry" simply repeated the failed request with the identical expired token from `localStorage`, trapping the user in an unrecoverable failure loop.
4. Furthermore, the frontend lacked proactive client-side JWT expiration checking. When users navigated to protected routes with an already-expired token, requests were needlessly sent to the backend only to fail with 401.

### Resolution Summary
We implemented a multi-layered, production-grade token handling and re-authentication architecture:
- **Client-Side JWT Inspection**: Added [`frontend/src/utils/jwt.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/utils/jwt.ts) with `isTokenExpired()` utilizing a 10-second safety buffer to preemptively intercept expired tokens before request transmission.
- **Proactive & Reactive Interceptors**: Updated [`frontend/src/api/client.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/api/client.ts) to block expired requests in flight, cleanly evict invalid tokens, and dispatch a debounced `cms:auth-unauthorized` custom event. Preserved `HTTP 403 Forbidden` without logging the user out.
- **Synchronized Auth Context**: Updated [`frontend/src/context/AuthContext.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/context/AuthContext.tsx) to listen for re-auth events, evict stale tokens during bootstrap without redundant network requests, and maintain a passive 30-second token monitor.
- **Route Guard Protection**: Updated [`frontend/src/components/auth/ProtectedRoute.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/auth/ProtectedRoute.tsx) to verify client-side token validity on every route transition.
- **Clear User Messaging**: Enhanced [`frontend/src/pages/LoginPage.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/LoginPage.tsx) to display a dedicated amber banner explaining that the operational session expired and prompting re-authentication.
- **Optimization View Resilience**: Refined [`frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx) to avoid flashing stuck error states during 401 transitions and properly label 403 authorization restrictions.

---

## 2. Root Cause Investigation & Verification

### A. Backend Investigation
- **Token Configuration**: In [`backend/app/core/config.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/core/config.py), `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60`. Tokens are signed using HMAC-SHA256 with `JWT_SECRET_KEY`.
- **Token Decoding**: In [`backend/app/core/security.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/core/security.py), `decode_access_token(token)` catches `jwt.ExpiredSignatureError` and `jwt.InvalidTokenError`, returning `None`.
- **Dependency Guard**: In [`backend/app/api/deps.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/api/deps.py), line 48:
  ```python
  payload = decode_access_token(raw_token)
  if not payload or "sub" not in payload:
      raise HTTPException(
          status_code=status.HTTP_401_UNAUTHORIZED,
          detail="Invalid or expired access token.",
          headers={"WWW-Authenticate": "Bearer"},
      )
  ```
  The backend behavior is strict, standards-compliant, and secure. It does not possess a refresh token endpoint (refresh tokens are not implemented on the backend).

### B. Frontend Root Cause
1. **No Token Eviction on 401**: In `frontend/src/api/client.ts`, the response interceptor merely rejected the Axios promise. `localStorage.getItem('cms_access_token')` was untouched.
2. **Missing Re-Authentication Trigger**: The React authentication context (`AuthContext`) was not informed that the token was rejected, keeping `isAuthenticated: true` in state until an explicit reload.
3. **Looping / Trapped UI in Resource Optimization**: `CrimeSpecificOptimizationView` called `loadOptimizationData()`. Upon receiving 401, it saved `error = "Invalid or expired access token."` and displayed `<ErrorState title="Optimization Error" onRetry={loadOptimizationData} />`. Clicking "Retry" re-sent the identical expired token and failed repeatedly.
4. **Lack of Concurrency Guard**: When multiple components on a page fired parallel queries (e.g., states list + optimization forecast + inventory summary), all requests simultaneously failed with 401, creating race conditions.

---

## 3. Implementation Details

### 1. Client-Side JWT Inspection Utility
**File**: [`frontend/src/utils/jwt.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/utils/jwt.ts)
- `parseJwtPayload(token)`: Safely extracts and decodes the middle base64url segment into a typed `JWTPayload` (`sub`, `role`, `exp`, `iat`). Handles URL-safe base64 padding and UTF-8 decoding without external dependencies.
- `isTokenExpired(token, bufferSeconds = 10)`: Evaluates if `(exp * 1000) <= (Date.now() + bufferSeconds * 1000)`. The 10-second buffer prevents race conditions where a token expires in flight between client transmission and server validation.
- `getTokenRemainingSeconds(token)`: Returns the seconds remaining until expiration.

### 2. Unified Axios Client & Interceptors
**File**: [`frontend/src/api/client.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/api/client.ts)
- **Single-Flight Lock (`notifyUnauthorized`)**: Employs a module-scoped lock `isHandlingUnauthorized` and debouncing timestamp to ensure that parallel 401 responses only trigger storage clearing and re-auth events once within a 2-second window.
- **Proactive Request Interception**: Validates `isTokenExpired(token)` before any non-public request leaves the client. If expired, it halts request execution immediately, clears `localStorage`, and triggers re-auth without wasting server round-trips.
- **Strict 401 vs. 403 Separation**:
  - `401 Unauthorized`: Calls `notifyUnauthorized('expired')`, clears tokens, sets `sessionStorage.setItem('cms_session_expired', 'true')`, and dispatches `'cms:auth-unauthorized'`.
  - `403 Forbidden`: Keeps the user logged in and token intact; formats a clear RBAC message: `"Access forbidden. Required operational role not assigned."`.

### 3. Reactive Session State & Idle Monitoring
**File**: [`frontend/src/context/AuthContext.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/context/AuthContext.tsx)
- **Bootstrap Eviction**: In `useState(() => ...)` and `initializeAuth()`, checks `isTokenExpired(storedToken)` immediately. If expired, clears `localStorage` and skips the redundant `/auth/me` network request.
- **Event Listener (`cms:auth-unauthorized`)**: Synchronously sets `token = null` and `user = null`, saving the attempted pathname in router state and redirecting to `/login`.
- **Idle Passive Monitor**: Runs a periodic check every 30 seconds. If an active tab sits idle past the token's expiration timestamp, it cleanly triggers re-authentication before the user clicks an action.

### 4. Route Guard & Login UX
**Files**: [`frontend/src/components/auth/ProtectedRoute.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/auth/ProtectedRoute.tsx), [`frontend/src/pages/LoginPage.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/LoginPage.tsx)
- **ProtectedRoute**: Checks `!isAuthenticated || !token || isTokenExpired(token)`. When expired, navigates to `/login` with `state: { sessionExpired: true, from: location }`.
- **LoginPage**: Reads `sessionExpired` from router state or `sessionStorage` fallback and displays a prominent amber operational notice:
  > **Operational Session Expired**  
  > Your security access token has expired. Please sign in with your credentials to resume your session.

### 5. Module Consistency
- **Resource Optimization**: In `CrimeSpecificOptimizationView.tsx`, 401 errors are caught and suppressed from flashing error cards while the auth redirect executes. 403 role errors display an "Access Restricted" alert with the specific missing role.
- **Reports Page**: In `ReportsPage.tsx`, updated `hasAuthToken` to read reactively from `const { isAuthenticated } = useAuth()`.
- **Predictions, Risk & Budget**: All use `apiClient`, uniformly inheriting proactive expiration checks and 401 re-authentication routing.

---

## 4. Verification and Test Results

### Test Suite 1: Frontend Production Build
- **Command**: `npm run build --prefix frontend` (`tsc -b && vite build`)
- **Result**: Passed with 0 errors in 1.73s.
- **Artifacts**: Bundled cleanly (`dist/assets/index-*.js`, `vendor-*.js`, etc.).

### Test Suite 2: Backend Authentication & RBAC Suite
- **Command**: `backend/.venv/Scripts/python.exe backend/tests/test_auth.py`
- **Result**: All Phase 6 & Phase 7C tests passed (100%).
  - Argon2id password hashing and verification
  - Login via username (`admin`) and email (`analyst@crimeops.gov.in`)
  - 401 on wrong password or nonexistent user
  - 403 on deactivated / inactive accounts
  - Role-based access control (`ADMIN` vs `ANALYST` vs `OFFICER`)
  - Staff account creation, deactivation, and safe audit logging

### Test Suite 3: Token Handling & Re-Authentication Verification
- **Command**: `backend/.venv/Scripts/python.exe backend/tests/test_token_handling_verification.py`
- **Result**: 100% Passed.

| Step | Test Description | Expected Result | Actual Result | Status |
|:---|:---|:---|:---|:---|
| 1 | Valid Login with Admin credentials | HTTP 200, JWT token returned | HTTP 200 OK | **PASS** |
| 2 | `/auth/me` with valid token | HTTP 200, User Profile returned | HTTP 200 OK | **PASS** |
| 3 | Expired token verification | HTTP 401 `"Invalid or expired access token."` | HTTP 401 Unauthorized | **PASS** |
| 4 | Tampered/malformed token | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** |
| 5 | Missing Authorization header | HTTP 401 `"Authentication required. Missing Bearer token."` | HTTP 401 Unauthorized | **PASS** |
| 6a | `/optimization/crime-optimize` with expired token | HTTP 401 `"Invalid or expired access token."` | HTTP 401 Unauthorized | **PASS** |
| 6b | `/optimization/crime-optimize` with OFFICER role | HTTP 403 `"Operation not permitted. Required role: ADMIN, ANALYST"` | HTTP 403 Forbidden | **PASS** |
| 6c | `/optimization/crime-optimize` with ADMIN role | HTTP 200 OK (280 Allocations computed) | HTTP 200 OK | **PASS** |
| 7 | Multi-module requests in single session (Predictions, Risk, Budget) | Consistent authenticated session responses | Valid responses, no session drops | **PASS** |

### Test Suite 4: Phase 11 Budget & Cost Analysis Integration
- **Command**: `backend/.venv/Scripts/python.exe backend/tests/test_budget_intelligence_phase_11.py`
- **Result**: Ran 13 tests in 54.7s. 100% Passed (`OK`).

---

## 5. Compliance with Guidelines & Constraints

- **No Bypass of JWT Authentication**: The JWT verification pipeline in `deps.py` and PyJWT HMAC-SHA256 decoding are strictly preserved.
- **No Insecure Mock/Refresh Mechanisms**: Because the backend does not implement refresh tokens, we implemented a clean, secure re-authentication flow rather than inventing an insecure workaround.
- **Preserved RBAC & Security**: 403 Forbidden responses maintain the user's active session while preventing unauthorized execution. Password hashing (Argon2id), salt lengths, and role enforcement remain unchanged.
- **Debounced Redirect Protection**: Rapid concurrent API requests do not trigger repeated redirects or page flickering.
