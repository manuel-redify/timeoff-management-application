# PRD 01: User Management & Authentication

**Document Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Draft  
**Author:** Senior Product Manager  
**Related PRDs:** PRD 00 (Overview), PRD 02 (Company Structure), PRD 04 (Leave Workflow), PRD 12 (Database Schema)

---

## Executive Summary

This PRD defines the comprehensive requirements for user management and authentication in TimeOff Management Application v2. This is a foundational feature that enables user registration, authentication, profile management, and role-based access control across the entire application.

### Business Context

User management is the cornerstone of the application, providing:
- Secure access control to company absence data
- Role-based permissions (Admin, Supervisor, Employee)
- User profile management for HR and administrative purposes
- Integration with modern authentication providers (Clerk)

### Goals and Objectives

1. **Seamless Authentication**: Implement modern, secure authentication using Clerk
2. **Flexible User Management**: Support multiple user roles and permissions
3. **Profile Completeness**: Capture all necessary employee information
4. **Security First**: Ensure data protection through proper authorization
5. **Migration Path**: Enable smooth transition from v1's Passport.js authentication

### Success Criteria

- Users can register and authenticate via Clerk (email/password, OAuth)
- All v1 user profile fields are supported in v2
- Role-based access control functions correctly across all features
- Admin users can manage other users effectively
- Data migration from v1 preserves all user information
- Authentication response time < 500ms (p95)

---

## 1. User Roles & Permissions

### 1.1 Role Definitions

#### Administrator
**Description:** Full system access with company-wide configuration capabilities

**Permissions:**
- All Employee and Supervisor permissions
- Create, edit, and delete users
- Manage company settings and configuration
- Manage departments and organizational structure
- Configure leave types and allowances
- Access all reports and data exports
- Manage system integrations
- View audit logs

**Restrictions:**
- Cannot delete their own admin account if they are the last admin
- Cannot remove themselves as admin if they are the last admin

#### Supervisor
**Description:** Department-level management with approval authority

**Permissions:**
- All Employee permissions
- Approve/reject leave requests for supervised departments
- View team calendars for supervised users
- View allowances for supervised users
- Create leave requests on behalf of supervised users
- View reports for supervised departments

**Restrictions:**
- Cannot modify company-wide settings
- Cannot create or delete users
- Cannot manage departments they don't supervise
- Cannot approve their own leave requests

#### Employee
**Description:** Standard user with self-service capabilities

**Permissions:**
- Submit leave requests
- View personal calendar and allowance
- View personal leave history
- Cancel own pending requests
- View team calendar (if company setting allows)
- Update own profile (limited fields)

**Restrictions:**
- Cannot approve leave requests
- Cannot view other users' detailed information
- Cannot access admin or supervisor functions
- Cannot modify company settings

### 1.2 Advanced Role System (Custom Roles)

Beyond the three base roles, v1 supports a custom role system with:

**Role Properties:**
- `name`: Role identifier (e.g., "Tech Lead", "Project Manager")
- `priority_weight`: Integer determining approval hierarchy
- `companyId`: Company-specific roles

**Role Assignment:**
- **Default Role**: User's primary/global role (`DefaultRoleId`)
- **Project-Specific Roles**: Override default role within project context
- **Area-Based Roles**: Roles can be scoped to specific areas

**Use Cases:**
- Approval workflows based on role hierarchy
- Project-specific approval chains
- Flexible organizational structures

---

## 2. Functional Requirements

### 2.1 User Registration

#### FR-UR-001: New Company Registration
**Priority:** Critical  
**Description:** Allow new companies to register with an initial admin user

**Requirements:**
- Registration form captures:
  - Company name
  - Admin user first name
  - Admin user last name
  - Admin user email address
  - Password (with confirmation)
  - Country (for default settings)
  - Timezone
- Email validation (format and uniqueness)
- Password strength requirements (minimum 8 characters)
- Email must be unique across the system
- Name fields cannot contain URLs/links (security)
- Automatic creation of default company structure:
  - Default department
  - Default leave types
  - Company settings with defaults
- First user automatically becomes admin
- First user automatically becomes department supervisor
- Send welcome/registration email upon successful registration
- Auto-login after successful registration

**Acceptance Criteria:**
- User can complete registration form
- Validation errors display clearly
- Duplicate email shows user-friendly error
- Company and admin user created atomically (transaction)
- Welcome email sent successfully
- User redirected to dashboard after registration

#### FR-UR-002: Registration Toggle
**Priority:** High  
**Description:** System administrators can enable/disable new registrations

**Requirements:**
- Configuration setting: `allow_create_new_accounts` (boolean)
- When disabled, registration page redirects to login
- When disabled, registration link hidden from login page
- Setting persists across restarts

**Acceptance Criteria:**
- Admin can toggle registration on/off
- Registration page inaccessible when disabled
- Existing users unaffected by setting

### 2.2 Authentication

#### FR-AU-001: Clerk Integration
**Priority:** Critical  
**Description:** Integrate Clerk for authentication management

**Requirements:**
- Clerk handles:
  - Email/password authentication
  - OAuth providers (Google, Microsoft, etc.)
  - Session management
  - Password reset flows
  - Email verification
- Clerk user ID mapped to Supabase user record
- User metadata synced between Clerk and Supabase
- Webhook handlers for Clerk events:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `session.created`
  - `session.ended`

**Acceptance Criteria:**
- Users can sign up via Clerk
- Users can sign in via Clerk
- Sessions persist correctly
- User data syncs to Supabase
- Webhooks process successfully

#### FR-AU-002: Email/Password Login
**Priority:** Critical  
**Description:** Users can authenticate with email and password

**Requirements:**
- Email normalized to lowercase
- Case-insensitive email matching
- Password hashed and secured (handled by Clerk)
- Failed login attempts logged
- Account lockout after excessive failed attempts (Clerk feature)
- "Remember me" functionality (Clerk feature)
- Session timeout configurable

**Acceptance Criteria:**
- Valid credentials grant access
- Invalid credentials show error
- Email case-insensitive
- Sessions expire appropriately

#### FR-AU-003: Password Reset
**Priority:** High  
**Description:** Users can reset forgotten passwords

**Requirements:**
- "Forgot Password" link on login page
- User enters email address
- System sends password reset email (via Clerk)
- Reset link expires after 24 hours
- Reset link single-use only
- User sets new password via secure form
- Confirmation email sent after successful reset
- User can login with new password immediately

**Acceptance Criteria:**
- User receives reset email
- Reset link works correctly
- Expired links show appropriate error
- New password accepted
- Confirmation email sent

#### FR-AU-004: Account Activation
**Priority:** Medium  
**Description:** Track user account activation status

**Requirements:**
- `activated` flag on user record (boolean)
- Initially `false` for new users
- Set to `true` on first successful login
- Used for analytics and onboarding tracking
- Does not block access (informational only)

**Acceptance Criteria:**
- New users have `activated = false`
- Flag updates on first login
- Flag persists correctly

#### FR-AU-005: Logout
**Priority:** Critical  
**Description:** Users can securely logout

**Requirements:**
- Logout button accessible from all pages
- Clerk session terminated
- User redirected to login page
- Session data cleared
- Confirmation message displayed

**Acceptance Criteria:**
- Logout terminates session
- User cannot access protected routes
- Redirect works correctly

### 2.3 User Profile Management

#### FR-UP-001: User Profile Fields
**Priority:** Critical  
**Description:** Capture comprehensive user profile information

**Required Fields:**
- `email`: Email address (unique, lowercase)
- `name`: First name
- `lastname`: Last name
- `DepartmentId`: Department assignment (foreign key)
- `companyId`: Company association (foreign key)
- `start_date`: Employment start date
- `admin`: Admin flag (boolean)
- `activated`: Account activation flag (boolean)
- `auto_approve`: Auto-approve leave requests flag (boolean)
- `contract_type`: Employee or Contractor (enum)

**Optional Fields:**
- `end_date`: Employment end date (for deactivation)
- `country`: Country code (2-letter ISO)
- `DefaultRoleId`: Default/global role (foreign key)

**Virtual/Computed Fields:**
- `full_name`: Concatenation of name + lastname

**Acceptance Criteria:**
- All fields stored correctly
- Required fields validated
- Email uniqueness enforced
- Dates formatted consistently (YYYY-MM-DD)

#### FR-UP-002: User Profile Editing (Admin)
**Priority:** High  
**Description:** Administrators can edit user profiles

**Requirements:**
- Admin can edit all user fields except:
  - User ID
  - Company ID (cannot move users between companies)
  - Clerk user ID
- Changes logged in audit trail
- Email changes require re-verification
- Cannot remove last admin from company
- Cannot set end_date in the past for active users with pending requests
- Validation on all fields
- Confirmation required for destructive changes

**Acceptance Criteria:**
- Admin can update user profiles
- Validation prevents invalid data
- Audit log records changes
- Cannot break system constraints

#### FR-UP-003: User Profile Editing (Self)
**Priority:** Medium  
**Description:** Users can edit their own limited profile fields

**Requirements:**
- Users can edit:
  - Name
  - Lastname
  - Country (if allowed by company settings)
- Users cannot edit:
  - Email (must go through Clerk)
  - Department
  - Admin flag
  - Auto-approve flag
  - Start/end dates
  - Role assignments
- Changes saved immediately
- Validation on editable fields

**Acceptance Criteria:**
- Users can update allowed fields
- Restricted fields not editable
- Changes persist correctly

#### FR-UP-004: User Deactivation
**Priority:** High  
**Description:** Deactivate users who leave the company

**Requirements:**
- Set `end_date` to deactivation date
- User cannot login after end_date
- User data retained for historical purposes
- Leaves and requests remain visible
- Cannot deactivate:
  - Last admin in company
  - Users with pending approval responsibilities
- Deactivated users excluded from:
  - User lists (by default)
  - Department assignments
  - Supervisor assignments
- Reactivation possible by clearing end_date

**Acceptance Criteria:**
- Setting end_date prevents login
- Historical data preserved
- Cannot deactivate critical users
- Reactivation works correctly

#### FR-UP-005: User Deletion
**Priority:** Medium  
**Description:** Permanently delete user accounts

**Requirements:**
- Only admins can delete users
- Cannot delete:
  - Admin users
  - Supervisor users (department bosses or secondary supervisors)
  - Users with approved/pending leaves
- Deletion cascades to:
  - All user's leave requests (deleted)
  - User's role assignments
  - User's project assignments
  - User's team assignments
- Deletion is permanent and irreversible
- Confirmation dialog required
- Audit log entry created

**Acceptance Criteria:**
- Only eligible users can be deleted
- Cascading deletion works correctly
- Confirmation prevents accidental deletion
- Audit trail maintained

### 2.4 Role Management

#### FR-RM-001: Assign Admin Role
**Priority:** Critical  
**Description:** Administrators can grant/revoke admin privileges

**Requirements:**
- Admin can set `admin` flag on any user
- Cannot remove admin flag from self if last admin
- Admin flag grants full system access
- Changes logged in audit trail
- Confirmation required for admin grants

**Acceptance Criteria:**
- Admin flag can be toggled
- Last admin protection works
- Permissions update immediately

#### FR-RM-002: Assign Default Role
**Priority:** High  
**Description:** Assign user's default/global role

**Requirements:**
- User can have one `DefaultRoleId`
- Role must belong to same company
- Default role used when no project-specific role defined
- Role dropdown shows all company roles
- "None" option available (no default role)
- Changes take effect immediately

**Acceptance Criteria:**
- Default role can be assigned
- Role validation works
- Role used correctly in workflows

#### FR-RM-003: Assign Project-Specific Roles
**Priority:** High  
**Description:** Override default role for specific projects

**Requirements:**
- User can have different role per project
- Project role overrides default role in project context
- If no project role, default role used
- Admin can assign project roles via user profile
- Project assignment and role assignment separate
- User can be assigned to project without specific role

**Acceptance Criteria:**
- Project roles can be assigned
- Project roles override default correctly
- Unassigned projects use default role

#### FR-RM-004: Custom Role Creation
**Priority:** Medium  
**Description:** Admins can create custom roles

**Requirements:**
- Admin can create company-specific roles
- Role properties:
  - Name (required, unique per company)
  - Priority weight (integer, for approval hierarchy)
  - Company ID (automatic)
- Roles used in approval workflows
- Roles can be assigned as default or project-specific
- Cannot delete roles in use

**Acceptance Criteria:**
- Custom roles can be created
- Roles appear in assignment dropdowns
- Roles function in workflows
- In-use roles cannot be deleted

### 2.5 User Listing & Search

#### FR-UL-001: User List (Admin)
**Priority:** High  
**Description:** Admins can view and manage all users

**Requirements:**
- Display all company users in table format
- Columns:
  - Name (sortable)
  - Email
  - Department
  - Role
  - Contract Type
  - Start Date
  - Status (Active/Inactive)
  - Actions (Edit, Delete)
- Sort by lastname by default
- Filter options:
  - Department
  - Role
  - Contract type
  - Active/Inactive status
- Search by name or email
- Pagination (50 users per page)
- Click row to edit user
- Bulk actions (future enhancement)

**Acceptance Criteria:**
- All users displayed correctly
- Sorting works on all columns
- Filters apply correctly
- Search finds users
- Pagination works

#### FR-UL-002: User List (Supervisor)
**Priority:** Medium  
**Description:** Supervisors can view supervised users

**Requirements:**
- Display users from supervised departments
- Same table format as admin view
- Cannot edit users outside supervised departments
- Cannot delete users
- Can view user details (read-only for non-supervised)

**Acceptance Criteria:**
- Supervised users displayed
- Non-supervised users excluded
- Edit permissions enforced

#### FR-UL-003: User List (Employee)
**Priority:** Low  
**Description:** Employees can view team members

**Requirements:**
- View users in same department (if company allows)
- Limited information displayed:
  - Name
  - Department
  - Email (if company allows)
- No edit capabilities
- No delete capabilities

**Acceptance Criteria:**
- Team members visible
- Information limited appropriately
- No edit/delete actions

### 2.6 User Import/Export

#### FR-IE-001: CSV User Import
**Priority:** Medium  
**Description:** Bulk import users via CSV file

**Requirements:**
- Admin uploads CSV file
- CSV format:
  - email, name, lastname, department, start_date, contract_type, country
- Validation before import:
  - Email format and uniqueness
  - Department exists
  - Date format correct
- Preview import before committing
- Error report for invalid rows
- Successful imports create users
- Invitation emails sent to new users
- Import logged in audit trail

**Acceptance Criteria:**
- CSV uploads successfully
- Validation catches errors
- Preview shows import plan
- Users created correctly
- Emails sent

#### FR-IE-002: CSV User Export
**Priority:** Medium  
**Description:** Export user data to CSV

**Requirements:**
- Admin can export all users
- Supervisor can export supervised users
- Export includes:
  - All profile fields
  - Department name
  - Role name
  - Allowance information
- CSV format compatible with import
- Export logged in audit trail

**Acceptance Criteria:**
- Export generates CSV
- All data included
- CSV format correct
- Permissions enforced

---

## 3. User Stories

### 3.1 Registration & Onboarding

**US-001: New Company Registration**
```
As a new customer
I want to register my company and create an admin account
So that I can start managing employee absences

Acceptance Criteria:
- I can access the registration page
- I can enter company and admin details
- I receive a welcome email
- I am logged in automatically after registration
- I see the dashboard with setup guidance
```

**US-002: Admin Adds New Employee**
```
As an administrator
I want to add a new employee to the system
So that they can request time off

Acceptance Criteria:
- I can access the "Add User" form
- I can enter all required employee information
- I can assign the employee to a department
- I can set their start date and allowance
- The employee receives an invitation email
- The employee appears in the user list
```

### 3.2 Authentication

**US-003: User Login**
```
As a registered user
I want to login with my email and password
So that I can access my time-off information

Acceptance Criteria:
- I can enter my email and password
- I am redirected to the dashboard on success
- I see an error message for invalid credentials
- My session persists across page refreshes
```

**US-004: Password Reset**
```
As a user who forgot their password
I want to reset my password via email
So that I can regain access to my account

Acceptance Criteria:
- I can click "Forgot Password" on login page
- I receive a password reset email
- I can click the link and set a new password
- I can login with my new password
- I receive a confirmation email
```

### 3.3 Profile Management

**US-005: Edit Own Profile**
```
As an employee
I want to update my personal information
So that my profile is current

Acceptance Criteria:
- I can access my profile page
- I can edit my name and country
- I cannot edit restricted fields
- Changes save successfully
- I see a confirmation message
```

**US-006: Admin Edits User Profile**
```
As an administrator
I want to edit employee profiles
So that I can keep employee information up to date

Acceptance Criteria:
- I can access any user's profile
- I can edit all profile fields
- I can change department assignments
- I can set admin privileges
- Changes are logged in audit trail
```

**US-007: Deactivate Employee**
```
As an administrator
I want to deactivate employees who leave the company
So that they cannot access the system but their history is preserved

Acceptance Criteria:
- I can set an end date for the employee
- The employee cannot login after the end date
- The employee's leave history remains visible
- The employee is excluded from active user lists
```

### 3.4 Role Management

**US-008: Assign Roles**
```
As an administrator
I want to assign roles to users
So that approval workflows function correctly

Acceptance Criteria:
- I can assign a default role to a user
- I can assign project-specific roles
- I can create custom roles
- Roles appear in approval workflows
```

**US-009: Manage Supervisors**
```
As an administrator
I want to designate users as supervisors
So that they can approve leave requests

Acceptance Criteria:
- I can assign a user as department boss
- I can assign secondary supervisors
- Supervisors can see their supervised users
- Supervisors can approve requests from their team
```

### 3.5 User Management

**US-010: View User List**
```
As an administrator
I want to view all company users
So that I can manage the workforce

Acceptance Criteria:
- I can see a list of all users
- I can sort by name, department, role
- I can filter by status, department, contract type
- I can search by name or email
- I can click a user to edit their profile
```

**US-011: Delete User**
```
As an administrator
I want to delete user accounts
So that I can remove test accounts or incorrect entries

Acceptance Criteria:
- I can delete non-admin, non-supervisor users
- I see a confirmation dialog
- The user and their leaves are deleted
- I cannot delete users with pending approvals
- The deletion is logged
```

---

## 4. Technical Specifications

### 4.1 Clerk Integration

#### Authentication Flow
1. User accesses protected route
2. Next.js middleware checks Clerk session
3. If no session, redirect to Clerk login
4. User authenticates via Clerk
5. Clerk creates session and redirects back
6. Middleware validates session
7. User ID extracted from Clerk session
8. User data fetched from Supabase
9. User authorized for route

#### Clerk Configuration
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

#### Middleware Setup
```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/register", "/login"],
  ignoredRoutes: ["/api/webhooks/clerk"]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

#### Webhook Handler
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)
  
  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    return new Response('Error verifying webhook', { status: 400 })
  }

  const supabase = createClient()

  switch (evt.type) {
    case 'user.created':
      await supabase.from('users').insert({
        clerk_user_id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: evt.data.first_name,
        lastname: evt.data.last_name,
      })
      break
    
    case 'user.updated':
      await supabase.from('users')
        .update({
          email: evt.data.email_addresses[0].email_address,
          name: evt.data.first_name,
          lastname: evt.data.last_name,
        })
        .eq('clerk_user_id', evt.data.id)
      break
    
    case 'user.deleted':
      // Handle user deletion if needed
      break
  }

  return new Response('', { status: 200 })
}
```

### 4.2 Database Schema (Users Table)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  admin BOOLEAN NOT NULL DEFAULT false,
  activated BOOLEAN NOT NULL DEFAULT false,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  country TEXT,
  contract_type TEXT NOT NULL DEFAULT 'Employee' CHECK (contract_type IN ('Employee', 'Contractor')),
  default_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_lastname ON users(lastname);
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (clerk_user_id = auth.uid());

-- Admins can view all users in their company
CREATE POLICY "Admins can view all company users"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE clerk_user_id = auth.uid() AND admin = true
    )
  );

-- Supervisors can view supervised users
CREATE POLICY "Supervisors can view supervised users"
  ON users FOR SELECT
  USING (
    department_id IN (
      SELECT id FROM departments 
      WHERE boss_id IN (
        SELECT id FROM users WHERE clerk_user_id = auth.uid()
      )
    )
    OR
    department_id IN (
      SELECT department_id FROM department_supervisors
      WHERE user_id IN (
        SELECT id FROM users WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- Only admins can insert/update/delete users
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE clerk_user_id = auth.uid() AND admin = true
    )
  );
```

### 4.3 API Endpoints

#### GET /api/users
**Description:** List users (with filtering and pagination)  
**Auth:** Required  
**Permissions:** Admin (all users), Supervisor (supervised users), Employee (team members)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 100)
- `department_id`: Filter by department
- `role_id`: Filter by role
- `contract_type`: Filter by contract type
- `status`: active | inactive | all (default: active)
- `search`: Search by name or email

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "john.doe@example.com",
      "name": "John",
      "lastname": "Doe",
      "full_name": "John Doe",
      "department_id": "uuid",
      "department_name": "Engineering",
      "admin": false,
      "contract_type": "Employee",
      "start_date": "2024-01-15",
      "end_date": null,
      "default_role_id": "uuid",
      "default_role_name": "Developer",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

#### GET /api/users/:id
**Description:** Get user details  
**Auth:** Required  
**Permissions:** Admin, Supervisor (if supervised), Self

**Response:**
```json
{
  "id": "uuid",
  "clerk_user_id": "clerk_id",
  "email": "john.doe@example.com",
  "name": "John",
  "lastname": "Doe",
  "full_name": "John Doe",
  "company_id": "uuid",
  "department_id": "uuid",
  "department": {
    "id": "uuid",
    "name": "Engineering",
    "boss_id": "uuid"
  },
  "admin": false,
  "activated": true,
  "auto_approve": false,
  "start_date": "2024-01-15",
  "end_date": null,
  "country": "US",
  "contract_type": "Employee",
  "default_role_id": "uuid",
  "default_role": {
    "id": "uuid",
    "name": "Developer",
    "priority_weight": 10
  },
  "projects": [
    {
      "id": "uuid",
      "name": "Project Alpha",
      "role_id": "uuid",
      "role_name": "Tech Lead"
    }
  ],
  "teams": [
    {
      "id": "uuid",
      "name": "Backend Team"
    }
  ],
  "areas": [
    {
      "id": "uuid",
      "name": "Engineering"
    }
  ],
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

#### POST /api/users
**Description:** Create new user  
**Auth:** Required  
**Permissions:** Admin only

**Request Body:**
```json
{
  "email": "jane.smith@example.com",
  "name": "Jane",
  "lastname": "Smith",
  "department_id": "uuid",
  "start_date": "2024-02-01",
  "contract_type": "Employee",
  "country": "US",
  "admin": false,
  "auto_approve": false,
  "default_role_id": "uuid",
  "send_invitation": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "jane.smith@example.com",
  "name": "Jane",
  "lastname": "Smith",
  "invitation_sent": true
}
```

#### PATCH /api/users/:id
**Description:** Update user  
**Auth:** Required  
**Permissions:** Admin (all fields), Self (limited fields)

**Request Body (Admin):**
```json
{
  "name": "Jane",
  "lastname": "Smith-Johnson",
  "department_id": "uuid",
  "admin": true,
  "auto_approve": false,
  "start_date": "2024-02-01",
  "end_date": "2025-12-31",
  "country": "UK",
  "contract_type": "Contractor",
  "default_role_id": "uuid"
}
```

**Request Body (Self):**
```json
{
  "name": "Jane",
  "lastname": "Smith-Johnson",
  "country": "UK"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "jane.smith@example.com",
  "name": "Jane",
  "lastname": "Smith-Johnson",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### DELETE /api/users/:id
**Description:** Delete user  
**Auth:** Required  
**Permissions:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response:**
```json
{
  "error": "Cannot delete admin user",
  "code": "USER_IS_ADMIN"
}
```

#### POST /api/users/import
**Description:** Bulk import users from CSV  
**Auth:** Required  
**Permissions:** Admin only

**Request:** Multipart form data with CSV file

**Response:**
```json
{
  "imported": 45,
  "failed": 5,
  "errors": [
    {
      "row": 12,
      "email": "invalid@",
      "error": "Invalid email format"
    }
  ]
}
```

#### GET /api/users/export
**Description:** Export users to CSV  
**Auth:** Required  
**Permissions:** Admin (all users), Supervisor (supervised users)

**Response:** CSV file download

### 4.4 Utility Functions

#### Check if User is Active
```typescript
export function isUserActive(user: User): boolean {
  if (!user.end_date) return true
  return new Date(user.end_date) > new Date()
}
```

#### Check if User is Admin
```typescript
export function isAdmin(user: User): boolean {
  return user.admin === true
}
```

#### Check if User is Supervisor
```typescript
export async function isSupervisor(userId: string): Promise<boolean> {
  const supabase = createClient()
  
  // Check if user is department boss
  const { data: departments } = await supabase
    .from('departments')
    .select('id')
    .eq('boss_id', userId)
  
  if (departments && departments.length > 0) return true
  
  // Check if user is secondary supervisor
  const { data: supervisors } = await supabase
    .from('department_supervisors')
    .select('id')
    .eq('user_id', userId)
  
  return supervisors && supervisors.length > 0
}
```

#### Get User's Effective Role
```typescript
export async function getUserEffectiveRole(
  userId: string, 
  projectId?: string
): Promise<Role | null> {
  const supabase = createClient()
  
  // If project context provided, check for project-specific role
  if (projectId) {
    const { data: userProject } = await supabase
      .from('user_projects')
      .select('role_id, roles(*)')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single()
    
    if (userProject?.role_id) {
      return userProject.roles
    }
  }
  
  // Fall back to default role
  const { data: user } = await supabase
    .from('users')
    .select('default_role_id, roles(*)')
    .eq('id', userId)
    .single()
  
  return user?.roles || null
}
```

#### Get Supervised Users
```typescript
export async function getSupervisedUsers(supervisorId: string): Promise<User[]> {
  const supabase = createClient()
  
  // Get departments where user is boss
  const { data: bossDepts } = await supabase
    .from('departments')
    .select('id')
    .eq('boss_id', supervisorId)
  
  // Get departments where user is secondary supervisor
  const { data: supervisorDepts } = await supabase
    .from('department_supervisors')
    .select('department_id')
    .eq('user_id', supervisorId)
  
  const departmentIds = [
    ...(bossDepts?.map(d => d.id) || []),
    ...(supervisorDepts?.map(d => d.department_id) || [])
  ]
  
  if (departmentIds.length === 0) return []
  
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('department_id', departmentIds)
    .order('lastname')
  
  return users || []
}
```

---

## 5. UI/UX Specifications

### 5.1 Registration Page

**Layout:**
- Centered form (max-width: 600px)
- Company logo/branding at top
- Clear section headers
- Progress indicator (optional)

**Form Fields:**
1. Company Information
   - Company Name (text input)
   - Country (dropdown)
   - Timezone (dropdown with search)

2. Administrator Information
   - First Name (text input)
   - Last Name (text input)
   - Email Address (email input)
   - Password (password input with strength indicator)
   - Confirm Password (password input)

3. Actions
   - "Create Account" button (primary)
   - "Already have an account? Login" link

**Validation:**
- Real-time validation on blur
- Clear error messages below fields
- Disable submit until valid
- Show success message on completion

### 5.2 Login Page

**Layout:**
- Centered form (max-width: 400px)
- Company logo at top
- Clean, minimal design

**Form Fields:**
- Email Address (email input)
- Password (password input)
- "Remember Me" checkbox (optional)
- "Forgot Password?" link
- "Login" button (primary)
- "Create Account" link (if registration enabled)

**Features:**
- OAuth buttons (Google, Microsoft) via Clerk
- Loading state during authentication
- Error messages for failed login

### 5.3 User List Page

**Layout:**
- Page header with "Users" title
- "Add User" button (admin only)
- Search bar (top right)
- Filters (department, role, status)
- User table
- Pagination controls

**Table Columns:**
- Avatar/Initials
- Name (sortable)
- Email
- Department
- Role
- Contract Type
- Status (Active/Inactive badge)
- Actions (Edit, Delete icons)

**Interactions:**
- Click row to edit user
- Hover shows action buttons
- Sort by clicking column headers
- Filter dropdown menus
- Search with debounce

### 5.4 User Profile Page

**Layout:**
- Breadcrumb navigation
- User name as page title
- Tabbed interface:
  - General (profile fields)
  - Absences (leave history)
  - Schedule (working hours)
  - Allowances (leave balances)

**General Tab:**
- Form with all profile fields
- Grouped sections:
  - Personal Information
  - Employment Details
  - Role & Permissions
  - Projects & Teams
  - Account Settings
- "Save Changes" button (bottom right)
- "Cancel" link

**Field Layout:**
- Labels above inputs
- Help text below inputs
- Required fields marked with *
- Disabled fields greyed out
- Date pickers for date fields
- Dropdowns for selections

### 5.5 Add User Modal/Page

**Layout:**
- Modal or full page (admin preference)
- "Add New User" title
- Form with essential fields
- "Create User" and "Cancel" buttons

**Form Fields:**
- Email Address *
- First Name *
- Last Name *
- Department *
- Start Date *
- Contract Type
- Country
- Default Role
- Send Invitation Email (checkbox, default checked)

**Behavior:**
- Validate email uniqueness on blur
- Auto-generate temporary password if invitation not sent
- Show success message with next steps
- Option to add another user

---

## 6. Migration from v1

### 6.1 Data Migration

**User Table Mapping:**

| v1 Field | v2 Field | Transformation |
|----------|----------|----------------|
| id | id | UUID conversion |
| email | email | Lowercase normalization |
| password | - | Migrated to Clerk (one-time password reset) |
| name | name | Direct copy |
| lastname | lastname | Direct copy |
| activated | activated | Direct copy |
| admin | admin | Direct copy |
| auto_approve | auto_approve | Direct copy |
| start_date | start_date | Date format conversion |
| end_date | end_date | Date format conversion |
| country | country | Direct copy |
| contract_type | contract_type | Direct copy |
| companyId | company_id | UUID conversion |
| DepartmentId | department_id | UUID conversion |
| DefaultRoleId | default_role_id | UUID conversion |

**Migration Steps:**
1. Export all users from v1 database
2. Create Clerk accounts for all users
3. Send password reset emails to all users
4. Import user data to Supabase
5. Map Clerk user IDs to Supabase user records
6. Migrate role assignments
7. Migrate project assignments
8. Migrate team assignments
9. Validate data integrity
10. Test authentication for sample users

**Migration Script Pseudocode:**
```typescript
async function migrateUsers(v1Users: V1User[]) {
  for (const v1User of v1Users) {
    // Create Clerk user
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [v1User.email],
      firstName: v1User.name,
      lastName: v1User.lastname,
      skipPasswordRequirement: true, // Will reset via email
    })
    
    // Create Supabase user record
    await supabase.from('users').insert({
      clerk_user_id: clerkUser.id,
      email: v1User.email.toLowerCase(),
      name: v1User.name,
      lastname: v1User.lastname,
      company_id: companyIdMap[v1User.companyId],
      department_id: departmentIdMap[v1User.DepartmentId],
      admin: v1User.admin,
      activated: v1User.activated,
      auto_approve: v1User.auto_approve,
      start_date: v1User.start_date,
      end_date: v1User.end_date,
      country: v1User.country,
      contract_type: v1User.contract_type,
      default_role_id: roleIdMap[v1User.DefaultRoleId],
    })
    
    // Send password reset email
    await clerkClient.users.sendPasswordResetEmail({
      userId: clerkUser.id,
    })
  }
}
```

### 6.2 Authentication Migration

**Challenge:** v1 uses Passport.js with MD5 hashed passwords; v2 uses Clerk

**Solution:**
1. Cannot migrate passwords directly (Clerk manages passwords)
2. All users must reset passwords on first v2 login
3. Migration process:
   - Create Clerk accounts with `skipPasswordRequirement: true`
   - Send password reset emails to all users
   - Users set new passwords via Clerk
   - Clerk handles password security (bcrypt, etc.)

**User Communication:**
- Email notification about migration
- Instructions for password reset
- Support contact for issues
- Migration deadline (if applicable)

### 6.3 LDAP Authentication

**v1 Behavior:**
- Optional LDAP authentication
- Company-level setting: `ldap_auth_enabled`
- LDAP server configuration stored in database
- Passport.js handles LDAP authentication

**v2 Approach:**
- Clerk does not natively support LDAP
- Options:
  1. **Recommended:** Migrate to Clerk's OAuth/SAML for enterprise SSO
  2. Custom LDAP integration via Clerk webhooks (complex)
  3. Defer LDAP support to future version

**Migration Path:**
- For companies using LDAP:
  - Assess if OAuth/SAML alternative acceptable
  - If not, defer migration or custom solution
  - Document as known limitation in v2.0

---

## 7. Testing Requirements

### 7.1 Unit Tests

**User Model Tests:**
- `isUserActive()` returns correct status
- `isAdmin()` identifies admin users
- `getUserEffectiveRole()` returns correct role
- `getSupervisedUsers()` returns correct users
- Email normalization works
- Date formatting consistent

**Validation Tests:**
- Email format validation
- Email uniqueness validation
- Password strength requirements
- Required field validation
- Date range validation (start_date < end_date)

### 7.2 Integration Tests

**Authentication Flow:**
- User can register new company
- User can login with valid credentials
- User cannot login with invalid credentials
- User can reset password
- User can logout
- Session persists correctly
- Session expires correctly

**User Management:**
- Admin can create user
- Admin can edit user
- Admin can delete eligible user
- Admin cannot delete ineligible user
- User can edit own profile (limited fields)
- User cannot edit restricted fields

**Role Management:**
- Admin can assign roles
- Roles apply correctly in workflows
- Project roles override default roles
- Custom roles can be created

**Clerk Integration:**
- Webhooks process correctly
- User data syncs to Supabase
- Clerk session validates correctly

### 7.3 End-to-End Tests

**Registration Journey:**
1. Navigate to registration page
2. Fill out registration form
3. Submit form
4. Verify welcome email sent
5. Verify user logged in
6. Verify company created
7. Verify default department created

**User Management Journey:**
1. Admin logs in
2. Navigate to user list
3. Click "Add User"
4. Fill out user form
5. Submit form
6. Verify user created
7. Verify invitation email sent
8. Navigate to user profile
9. Edit user details
10. Save changes
11. Verify changes persisted

**Password Reset Journey:**
1. Navigate to login page
2. Click "Forgot Password"
3. Enter email
4. Submit form
5. Verify reset email sent
6. Click reset link in email
7. Enter new password
8. Submit form
9. Verify confirmation email sent
10. Login with new password

### 7.4 Security Tests

**Authorization Tests:**
- Non-admin cannot access admin routes
- Non-supervisor cannot access supervisor routes
- User cannot access other users' data
- RLS policies enforce data isolation
- API endpoints enforce permissions

**Input Validation:**
- SQL injection attempts blocked
- XSS attempts sanitized
- CSRF protection active
- Rate limiting prevents brute force
- Email validation prevents invalid formats

---

## 8. Dependencies & References

### 8.1 Related PRDs

- **PRD 00:** Project Overview - Overall architecture and tech stack
- **PRD 02:** Company & Organizational Structure - Department and supervisor management
- **PRD 04:** Leave Request Workflow - User roles in approval workflows
- **PRD 06:** Employee Allowance Management - User allowances and calculations
- **PRD 12:** Database Schema - Complete database design
- **PRD 13:** API Specifications - API design patterns
- **PRD 14:** Security & Compliance - Security requirements

### 8.2 External Documentation

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Integration](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### 8.3 Legacy Code References

- `lib/model/db/user.js` - v1 User model
- `lib/passport/index.js` - v1 Passport authentication
- `lib/route/login.js` - v1 Login/registration routes
- `views/register.hbs` - v1 Registration form
- `views/partials/user_details/general.hbs` - v1 User profile form

---

## 9. Open Questions & Decisions

### 9.1 Decisions Required

1. **LDAP Support in v2:**
   - ❓ Do we support LDAP in v2.0 or defer to future version?
   - ❓ If supported, use Clerk SAML/OAuth or custom integration?

2. **User Invitation Flow:**
   - ❓ Should new users set their own password via invitation email?
   - ❓ Or should admin set initial password?

3. **Email Verification:**
   - ❓ Require email verification before first login?
   - ❓ Or allow login immediately after registration?

4. **Multi-Factor Authentication:**
   - ❓ Enable MFA in v2.0 or defer to future version?
   - ❓ If enabled, required for admins or optional for all?

5. **User Deletion vs Deactivation:**
   - ❓ Encourage deactivation over deletion?
   - ❓ Soft delete vs hard delete?

### 9.2 Assumptions

- Clerk free tier sufficient for initial deployment
- Users have modern browsers supporting Clerk
- Email delivery reliable for password resets
- Companies willing to migrate from LDAP to OAuth/SAML
- One admin per company acceptable for initial setup

---

## 10. Success Metrics

### 10.1 Development Metrics

- All user stories implemented and tested
- 100% feature parity with v1 user management
- Test coverage > 80% for user-related code
- Zero critical security vulnerabilities
- API response times < 500ms (p95)

### 10.2 User Metrics (Post-Launch)

- User registration completion rate > 90%
- Login success rate > 95%
- Password reset completion rate > 80%
- User profile update frequency
- Admin user management activity

### 10.3 Technical Metrics

- Clerk webhook processing success rate > 99%
- User data sync accuracy 100%
- Authentication latency < 500ms (p95)
- Session validation latency < 100ms (p95)

---

## 11. Appendix

### 11.1 Glossary

- **Clerk:** Third-party authentication service
- **RLS:** Row Level Security (Supabase feature)
- **Webhook:** HTTP callback for event notifications
- **OAuth:** Open Authorization standard
- **SAML:** Security Assertion Markup Language
- **LDAP:** Lightweight Directory Access Protocol
- **MFA:** Multi-Factor Authentication

### 11.2 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | PM Team | Initial draft based on v1 analysis |

---

## 12. Approval

This document requires approval from:
- [ ] Executive Sponsor
- [ ] Technical Lead
- [ ] Security Team
- [ ] Product Manager

---

*End of PRD 01 - User Management & Authentication*
