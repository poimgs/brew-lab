# Authentication

## Context

This specification defines the authentication system for the Coffee Tracker. The app is designed for single-user use, but implements proper authentication for:
- Data security
- Future multi-user potential
- Standard security practices

## Requirements

### Authentication Method

Email/password authentication with JWT tokens.

### User Provisioning

Users are created via CLI tool (no public registration endpoint):

```bash
cd backend && make seed-user EMAIL=user@example.com PASSWORD=SecurePass123!
```

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

Password is hashed using bcrypt (cost factor 12).

### Login

1. User provides email and password
2. System verifies credentials
3. On success: JWT access token + refresh token issued
4. On failure: Generic "invalid credentials" error (no user enumeration)

### JWT Structure

Access Token:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1705660000,
  "exp": 1705663600
}
```

Refresh Token:
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1705660000,
  "exp": 1706264800
}
```

### Token Lifetimes

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 1 hour | Memory (frontend) |
| Refresh Token | 7 days | HttpOnly cookie |

### Token Refresh

1. Frontend detects access token expiring (or 401 response)
2. Calls `/api/v1/auth/refresh` with refresh token (from cookie)
3. Server validates refresh token
4. New access token issued
5. Refresh token rotated (old one invalidated)

### Logout

1. Client calls `/api/v1/auth/logout`
2. Server invalidates refresh token
3. Client clears access token from memory
4. Refresh token cookie cleared

### Session Management

- No server-side session storage (stateless JWT)
- Refresh token stored in database for revocation
- Token blacklist not implemented initially (short access token lifetime sufficient)

## Design Decisions

### JWT over Sessions

JWT chosen because:
- Stateless server (scales easily)
- Simple implementation
- Standard approach for SPAs
- Works well with Go backend

### Refresh Token in Cookie

Refresh token stored in HttpOnly cookie:
- Protected from XSS
- Automatic inclusion in requests
- Secure flag for HTTPS only
- SameSite=Strict for CSRF protection

### Access Token in Memory

Access token kept in memory (not localStorage):
- Cleared on page close
- Protected from XSS
- Must be passed explicitly in Authorization header

### Bcrypt for Passwords

Bcrypt with cost factor 12:
- Industry standard
- Adaptive (can increase cost over time)
- Built-in salt
- Resistant to rainbow tables

### No OAuth Initially

OAuth (Google, GitHub) not implemented because:
- Single-user tool doesn't need social login
- Simpler implementation
- Can add later if multi-user desired

### No Email Verification Initially

Email verification skipped because:
- Single-user, self-hosted context
- User controls their own instance
- Can add later for multi-user

### Generic Error Messages

Login failures return generic messages:
- Prevents user enumeration attacks
- "Invalid email or password" for all failures
- Same response time regardless of whether email exists

## Security Considerations

### HTTPS Required

- All auth endpoints must use HTTPS in production
- Access tokens transmitted in Authorization header
- Refresh tokens in Secure cookies

### CORS Configuration

```
Access-Control-Allow-Origin: <frontend-domain>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Rate Limiting

Login endpoint is rate-limited:
- 5 attempts per minute per IP

### Password Storage

- Never log passwords
- Never return password hashes in API responses
- Use constant-time comparison for password verification

## API Endpoints

### Login
```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "access_token": "eyJ..."
}
+ Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

### Refresh
```
POST /api/v1/auth/refresh
(refresh_token sent via cookie)

Response 200:
{
  "access_token": "eyJ..."
}
+ Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

### Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>

Response 204
+ Set-Cookie: refresh_token=; Max-Age=0
```

### Current User
```
GET /api/v1/auth/me
Authorization: Bearer <access_token>

Response 200:
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-01-19T10:00:00Z"
}
```
