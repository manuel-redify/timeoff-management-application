# PRD 01: User Management & Authentication

**Document Version:** 1.0
**Date:** January 8, 2026
**Status:** Draft
**Author:** AI Development Agent

---

## Executive Summary

User Management is the foundational feature of the TimeOff Management Application v2. It handles secure authentication via Clerk, user identity management, and role-based access control (RBAC). This feature ensures that only authorized personnel can access the system and that users see data appropriate to their role (Employee, Supervisor, or Administrator).

**Success Criteria:**
- Users can sign up and sign in using Clerk.
- User data is automatically synced from Clerk to Supabase `users` table.
- Users are assigned a Company and Department (initially null or default).
- RBAC is enforced via Middleware and RLS policies.

---

## Requirements

### 1. Authentication
- **Provider:** Clerk.
- **Methods:** Email/Password, Social Login (Google, Microsoft) - optional for now.
- **Flows:**
  - Sign Up: Create new account.
  - Sign In: Access existing account.
  - Sign Out: Terminate session.
  - Forgot Password: handled by Clerk.

### 2. User Profile Management
- **Data Source:** Clerk is the source of truth for auth credentials (email, password).
- **Data Sync:** A `users` table in Supabase mirrors essential user data for relational integrity.
- **Fields Synced:**
  - `clerk_id` (Primary Key / Unique Index)
  - `email`
  - `first_name`
  - `last_name`
  - `full_name`

### 3. Role-Based Access Control (RBAC)
- **Roles:**
  - `admin`: Full system access.
  - `supervisor`: Approver rights for specific departments.
  - `employee`: Standard access (request leave, view own data).
- **Implementation:**
  - Roles stored in `users` table (or separate `roles` table if complex, but simple column is usually sufficient for v1 parity).
  - Protected routes via Clerk Middleware.
  - Data protection via Supabase RLS.

---

## Technical Specifications

### Database Schema (Supabase)

From `llm_dev_guide.md` guidelines:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  company_id UUID REFERENCES companies(id), -- Nullable initially
  department_id UUID REFERENCES departments(id), -- Nullable initially
  is_admin BOOLEAN DEFAULT FALSE,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
```

### API Endpoints

- **Webhook:** `/api/webhooks/clerk` - Receives user created/updated events from Clerk to sync with Supabase.

### Integration Points

- **Clerk:** Handles all auth UI and session management.
- **Supabase:** Stores business data linked to `users.id` (not `clerk_id` directly, usually, or mapped). *Decision: Use internal UUID for FKs, map `clerk_id` to `id` in `users` table.*

---

## User Experience

- **Auth Screens:** Standard Clerk components (`<SignIn />`, `<SignUp />`).
- **Profile:** Basic profile view fetching from Supabase.

---

## Testing Requirements

- **Unit Tests:** Verify webhook handler logic.
- **Integration Tests:**
  - Create user in Clerk -> Verify row in Supabase.
  - Update user in Clerk -> Verify update in Supabase.
- **Manual:**
  - Sign up flow.
  - Sign in flow.
  - Verify `users` table population.

---

## Dependencies

- **PRD 00:** Project Setup (Completed).
- **External:** Clerk Application set up with Webhooks enabled.
