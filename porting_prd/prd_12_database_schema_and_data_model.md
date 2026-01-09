# PRD 12: Database Schema & Data Model

Created by: Manuel Magnani
Created time: January 9, 2026 8:10 AM
Category: PRD
Last updated time: January 9, 2026 8:13 AM
Projects: PTO System v2 (https://www.notion.so/PTO-System-v2-2e269d035b1980cf9941ca5e8f7d9338?pvs=21)

**Document Version:** 2.0

**Date:** January 9, 2026

**Status:** Draft - Updated from Legacy Analysis

**Author:** Senior Product Manager

---

## Executive Summary

This document defines the COMPLETE database schema for TimeOff Management Application v2, based on comprehensive analysis of the legacy SQLite database. The schema migrates from Sequelize/SQLite to PostgreSQL for Supabase, incorporating Row Level Security (RLS), proper relationships, and all discovered entities including advanced workflow features.

**Important Update**: After analyzing the actual database, several critical tables and features were discovered that were not in the initial PRD, including:

- Multi-role approval system with flexible workflow tables
- Project and team management
- Department supervisor relationships (many-to-many)
- Advanced approval rules and steps
- Watcher notification system
- Session management
- User role assignments to areas and projects

---

## 1. Complete Schema Overview

### 1.1 Table Categories

**Core Entities (4 tables)**

- companies
- users
- departments
- leave_types

**Operational Data (5 tables)**

- leave_requests (Leaves)
- user_allowance_adjustments
- bank_holidays
- schedules
- sessions

**Organizational Structure (6 tables)**

- roles
- areas
- teams
- projects
- department_supervisor (junction)
- user_team (junction)

**Approval Workflow (4 tables)**

- approval_rules
- approval_steps
- watcher_rules
- user_project (junction with role)

**Supporting Tables (4 tables)**

- email_audit
- user_feeds
- comments
- user_role_area (junction)

**System Tables (2 tables)**

- audit_logs
- sequelize_meta (migration tracking)

---

## 2. Core Entities

### 2.1 Companies Table

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Information
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  country TEXT NOT NULL CHECK (length(country) = 2), -- ISO 3166-1 alpha-2
  timezone TEXT DEFAULT 'Europe/London',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',

  -- Year Settings
  start_of_new_year INTEGER NOT NULL DEFAULT 1 CHECK (start_of_new_year >= 1 AND start_of_new_year <= 12),

  -- Sharing & Visibility
  share_all_absences BOOLEAN DEFAULT FALSE,
  is_team_view_hidden BOOLEAN DEFAULT FALSE,

  -- LDAP Configuration
  ldap_auth_enabled BOOLEAN DEFAULT FALSE,
  ldap_auth_config TEXT, -- JSON string

  -- Carry Over & Mode
  carry_over INTEGER DEFAULT 0 CHECK (carry_over >= 0),
  mode INTEGER NOT NULL DEFAULT 1, -- Mode flag for company operations

  -- Company-wide Message
  company_wide_message TEXT,

  -- Integration API
  integration_api_enabled BOOLEAN DEFAULT FALSE,
  integration_api_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_deleted_at ON companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_api_token ON companies(integration_api_token) WHERE integration_api_enabled = TRUE;

-- RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE clerk_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT u.company_id FROM users u
      WHERE u.clerk_id = auth.uid() AND u.is_admin = TRUE
    )
  );

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

```

**Legacy Mapping**: v1 `Companies` table

**Key Changes**: Added integration_api fields, mode, company_wide_message

---

### 2.2 Users Table (UPDATED)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  clerk_id TEXT UNIQUE NOT NULL,

  -- User Information
  email TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  lastname TEXT NOT NULL CHECK (length(lastname) >= 1 AND length(lastname) <= 100),

  -- Relationships
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

  -- Employment
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  country TEXT CHECK (length(country) = 2), -- ISO country code
  contract_type TEXT NOT NULL DEFAULT 'Employee', -- Employee, Contractor, etc.

  -- Role & Status
  activated BOOLEAN NOT NULL DEFAULT TRUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_auto_approve BOOLEAN NOT NULL DEFAULT FALSE,

  -- Default Role (for multi-role system)
  default_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_department_id ON users(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_lastname ON users(lastname);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_company_active ON users(company_id, activated) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_admin_lookup ON users(company_id, is_admin) WHERE deleted_at IS NULL;

-- RLS Policies (same as before but updated for new fields)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `Users` table

**Key Changes**: Added country, contract_type, default_role_id fields. Note that password field is removed (handled by Clerk). Allowance fields have been removed in favor of a cleaner separation.

---

### 2.3 Departments Table (UPDATED)

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  allowance DECIMAL(10,2) CHECK (allowance IS NULL OR (allowance >= 0 AND allowance <= 365)),
  include_public_holidays BOOLEAN NOT NULL DEFAULT TRUE,
  is_accrued_allowance BOOLEAN NOT NULL DEFAULT FALSE,

  -- Legacy field (may be deprecated)
  boss_id UUID REFERENCES users(id) ON DELETE SET NULL,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_department_name_per_company UNIQUE(company_id, name, deleted_at)
);

CREATE INDEX idx_departments_id ON departments(id);
CREATE INDEX idx_departments_company_id ON departments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_boss_id ON departments(boss_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_deleted_at ON departments(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `Departments` table

**Key Changes**: Made allowance nullable, added is_accrued_allowance flag, kept boss_id for legacy compatibility but note that supervisor relationships are primarily managed through department_supervisor junction table

---

### 2.4 Department Supervisor Junction Table (NEW)

```sql
CREATE TABLE department_supervisor (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (department_id, user_id)
);

CREATE INDEX idx_department_supervisor_department_id ON department_supervisor(department_id);
CREATE INDEX idx_department_supervisor_user_id ON department_supervisor(user_id);

ALTER TABLE department_supervisor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view department supervisors"
  ON department_supervisor FOR SELECT
  USING (
    department_id IN (
      SELECT d.id FROM departments d
      WHERE d.company_id IN (
        SELECT company_id FROM users WHERE clerk_id = auth.uid()
      )
    )
  );

```

**Purpose**: Allows multiple supervisors per department (many-to-many relationship)

**Legacy**: Found in v1 database

**Note**: This is the PRIMARY way supervisors are assigned to departments in the legacy system

---

### 2.5 Leave Types Table (UPDATED)

```sql
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  color TEXT NOT NULL DEFAULT '#ffffff' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),

  use_allowance BOOLEAN NOT NULL DEFAULT TRUE,
  limit INTEGER CHECK (limit IS NULL OR (limit >= 0 AND limit <= 365)),
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Auto-approval feature
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_leave_type_name_per_company UNIQUE(company_id, name, deleted_at)
);

CREATE INDEX idx_leave_types_company_id ON leave_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_types_sort_order ON leave_types(company_id, sort_order);
CREATE INDEX idx_leave_types_auto_approve ON leave_types(company_id, auto_approve);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `LeaveTypes` table

**Key Changes**: Added auto_approve flag

---

## 3. Organizational Structure (NEW SECTION)

### 3.1 Roles Table

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  priority_weight INTEGER NOT NULL DEFAULT 0,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_role_name_per_company UNIQUE(company_id, name)
);

CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_priority ON roles(company_id, priority_weight DESC);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define organizational roles for multi-role approval system (e.g., PM, Tech Lead, CEO, CTO)

**Note**: Used in advanced approval workflows

---

### 3.2 Areas Table

```sql
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_area_name_per_company UNIQUE(company_id, name)
);

CREATE INDEX idx_areas_company_id ON areas(company_id);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define organizational areas (e.g., Front-end, Back-end, Business Analysis)

---

### 3.3 Teams Table

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_team_name_per_company UNIQUE(company_id, name)
);

CREATE INDEX idx_teams_company_id ON teams(company_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define teams within the organization

---

### 3.4 Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  type TEXT NOT NULL, -- 'Project', 'Client', 'Internal', etc.

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_project_name_per_company UNIQUE(company_id, name)
);

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_type ON projects(company_id, type);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define projects for project-based approval routing

---

### 3.5 User Team Junction Table

```sql
CREATE TABLE user_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_team UNIQUE(user_id, team_id)
);

CREATE INDEX idx_user_team_user_id ON user_team(user_id);
CREATE INDEX idx_user_team_team_id ON user_team(team_id);

ALTER TABLE user_team ENABLE ROW LEVEL SECURITY;

```

---

### 3.6 User Project Junction Table (with Role)

```sql
CREATE TABLE user_project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_project_role UNIQUE(user_id, project_id, role_id)
);

CREATE INDEX idx_user_project_user_id ON user_project(user_id);
CREATE INDEX idx_user_project_project_id ON user_project(project_id);
CREATE INDEX idx_user_project_role_id ON user_project(role_id);

ALTER TABLE user_project ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Assign users to projects with specific roles

---

### 3.7 User Role Area Junction Table

```sql
CREATE TABLE user_role_area (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_role_area UNIQUE(user_id, role_id, area_id)
);

CREATE INDEX idx_user_role_area_user_id ON user_role_area(user_id);
CREATE INDEX idx_user_role_area_role_id ON user_role_area(role_id);
CREATE INDEX idx_user_role_area_area_id ON user_role_area(area_id);

ALTER TABLE user_role_area ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Assign users to roles within specific areas

---

## 4. Operational Data

### 4.1 Leave Requests Table (UPDATED)

```sql
CREATE TYPE leave_status AS ENUM (
  'new',
  'approved',
  'rejected',
  'pended_revoke',
  'canceled'
);

CREATE TYPE day_part AS ENUM (
  'all',          -- Full day (value 1 in legacy)
  'morning',      -- Morning only (value 2 in legacy)
  'afternoon'     -- Afternoon only (value 3 in legacy)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request Details
  date_start DATE NOT NULL,
  day_part_start day_part NOT NULL DEFAULT 'all',
  date_end DATE NOT NULL,
  day_part_end day_part NOT NULL DEFAULT 'all',

  status leave_status NOT NULL DEFAULT 'new',

  -- Relationships
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Comments
  employee_comment TEXT CHECK (length(employee_comment) <= 255),
  approver_comment TEXT CHECK (length(approver_comment) <= 255),

  -- Decision Tracking
  decided_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_date_range CHECK (date_end >= date_start),
  CONSTRAINT approver_comment_required_on_rejection CHECK (
    status != 'rejected' OR approver_comment IS NOT NULL
  )
);

CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_status ON leave_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_dates ON leave_requests(date_start, date_end) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_leave_type ON leave_requests(leave_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_approver ON leave_requests(approver_id, status) WHERE status = 'new';
CREATE INDEX idx_leave_requests_user_dates ON leave_requests(user_id, date_start, date_end) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_pending ON leave_requests(status, created_at) WHERE status = 'new';

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `Leaves` table

**Key Changes**:

- Renamed from Leaves to leave_requests
- Added day_part fields for half-day support
- Status is stored as INTEGER in legacy (1=new, 2=approved, 3=rejected, 4=pended_revoke, 5=canceled)
- Removed days_deducted field (calculated on-the-fly)

**Note**: The legacy `status` field uses integers:

- 1 = new
- 2 = approved
- 3 = rejected
- 4 = pended_revoke
- 5 = canceled

---

### 4.2 User Allowance Adjustments Table (UPDATED)

```sql
CREATE TABLE user_allowance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE) CHECK (year >= 2000 AND year <= 2100),
  adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  carried_over_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_year UNIQUE(user_id, year)
);

CREATE INDEX idx_allowance_adjustments_user_id ON user_allowance_adjustments(user_id);
CREATE INDEX idx_allowance_adjustments_year ON user_allowance_adjustments(user_id, year);

ALTER TABLE user_allowance_adjustments ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `user_allowance_adjustment` table

**Key Changes**: Added unique constraint, updated_at removed (not in legacy)

---

### 4.3 Bank Holidays Table (UPDATED)

```sql
CREATE TABLE bank_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 200),
  date DATE NOT NULL,
  country TEXT NOT NULL DEFAULT 'UK' CHECK (length(country) = 2),

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_holiday_date_per_company UNIQUE(company_id, date, deleted_at)
);

CREATE INDEX idx_bank_holidays_company_id ON bank_holidays(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_holidays_date ON bank_holidays(company_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_holidays_country ON bank_holidays(country);

ALTER TABLE bank_holidays ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `BankHolidays` table

**Key Changes**: Added country field

---

### 4.4 Schedules Table

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  monday BOOLEAN NOT NULL DEFAULT TRUE,
  tuesday BOOLEAN NOT NULL DEFAULT TRUE,
  wednesday BOOLEAN NOT NULL DEFAULT TRUE,
  thursday BOOLEAN NOT NULL DEFAULT TRUE,
  friday BOOLEAN NOT NULL DEFAULT TRUE,
  saturday BOOLEAN NOT NULL DEFAULT FALSE,
  sunday BOOLEAN NOT NULL DEFAULT FALSE,

  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT schedule_belongs_to_company_or_user CHECK (
    (company_id IS NOT NULL AND user_id IS NULL) OR
    (company_id IS NULL AND user_id IS NOT NULL)
  ),
  CONSTRAINT at_least_one_working_day CHECK (
    monday OR tuesday OR wednesday OR thursday OR friday OR saturday OR sunday
  )
);

CREATE INDEX idx_schedule_company_id ON schedules(company_id);
CREATE INDEX idx_schedule_user_id ON schedules(user_id);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `schedule` table

**Note**: Days are stored as INTEGER in legacy (1=working, 2=not working)

**Recommendation**: Consider deprecating in favor of JSONB in companies/users tables

---

### 4.5 Sessions Table

```sql
CREATE TABLE sessions (
  sid TEXT PRIMARY KEY,
  expires TIMESTAMPTZ,
  data TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_expires ON sessions(expires);

-- No RLS needed - sessions are managed by Express middleware

```

**Purpose**: Express session storage (legacy - will be replaced by Clerk sessions in v2)

**Note**: Can be deprecated in v2 as Clerk handles sessions

---

## 5. Approval Workflow System (NEW)

### 5.1 Approval Rules Table

```sql
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request Context
  request_type TEXT NOT NULL, -- 'LEAVE', etc.
  project_type TEXT NOT NULL, -- 'Project', 'Client', 'Internal', etc.

  -- Subject (person making request)
  subject_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  subject_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,

  -- Approver Requirements
  approver_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  approver_area_constraint TEXT, -- 'SAME_AS_SUBJECT', 'ANY', etc.

  -- Constraints
  team_scope_required BOOLEAN NOT NULL DEFAULT FALSE,
  sequence_order INTEGER, -- Order in approval chain

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_rules_company_id ON approval_rules(company_id);
CREATE INDEX idx_approval_rules_subject_role ON approval_rules(subject_role_id);
CREATE INDEX idx_approval_rules_approver_role ON approval_rules(approver_role_id);
CREATE INDEX idx_approval_rules_lookup ON approval_rules(company_id, request_type, project_type, subject_role_id);

ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define which roles must approve requests from other roles

**Example**: "Developer leave requests on Projects must be approved by PM (same area), then Tech Lead"

---

### 5.2 Approval Steps Table

```sql
CREATE TABLE approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  leave_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  status INTEGER NOT NULL, -- 1=pending, 2=approved, 3=rejected
  sequence_order INTEGER,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_steps_leave_id ON approval_steps(leave_id);
CREATE INDEX idx_approval_steps_approver_id ON approval_steps(approver_id);
CREATE INDEX idx_approval_steps_status ON approval_steps(status) WHERE status = 1;

ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Track individual approval steps for each leave request

**Note**: Supports multi-stage approval workflows

---

### 5.3 Watcher Rules Table

```sql
CREATE TABLE watcher_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule Context
  request_type TEXT NOT NULL, -- 'LEAVE', etc.
  project_type TEXT NOT NULL,

  -- Watcher Criteria
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  team_scope_required BOOLEAN NOT NULL DEFAULT FALSE,
  contract_type TEXT, -- 'Employee', 'Contractor', etc.

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watcher_rules_company_id ON watcher_rules(company_id);
CREATE INDEX idx_watcher_rules_role_id ON watcher_rules(role_id);
CREATE INDEX idx_watcher_rules_team_id ON watcher_rules(team_id);

ALTER TABLE watcher_rules ENABLE ROW LEVEL SECURITY;

```

**Purpose**: Define who should receive notifications about leave requests (beyond approvers)

**Example**: "All PMs should be notified of contractor leave requests"

---

## 6. Supporting Tables

### 6.1 Email Audit Table

```sql
CREATE TABLE email_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_audit_company_id ON email_audit(company_id);
CREATE INDEX idx_email_audit_user_id ON email_audit(user_id);
CREATE INDEX idx_email_audit_created_at ON email_audit(created_at DESC);

ALTER TABLE email_audit ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `EmailAudit` table

---

### 6.2 User Feeds Table

```sql
CREATE TABLE user_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  feed_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  type TEXT NOT NULL, -- 'calendar', 'teamview', etc.

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_feeds_user_id ON user_feeds(user_id);
CREATE INDEX idx_user_feeds_token ON user_feeds(feed_token);

ALTER TABLE user_feeds ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `UserFeeds` table

---

### 6.3 Comments Table

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  comment TEXT NOT NULL CHECK (length(comment) >= 1 AND length(comment) <= 255),

  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_company_id ON comments(company_id);
CREATE INDEX idx_comments_by_user_id ON comments(by_user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `comment` table

**Note**: Generic comment system that can attach to any entity

---

## 7. System Tables

### 7.1 Audit Table

```sql
CREATE TABLE audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  attribute TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,

  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit(entity_type, entity_id);
CREATE INDEX idx_audit_company_id ON audit(company_id);
CREATE INDEX idx_audit_at ON audit(at DESC);

ALTER TABLE audit ENABLE ROW LEVEL SECURITY;

```

**Legacy Mapping**: v1 `audit` table

**Purpose**: Track all data changes for compliance

---

### 7.2 Sequelize Meta Table

```sql
CREATE TABLE sequelize_meta (
  name TEXT PRIMARY KEY
);

```

**Purpose**: Migration tracking for Sequelize (legacy - replace with Supabase migrations in v2)

---

## 8. Utility Functions (UPDATED)

### 8.1 Calculate Working Days Function

```sql
CREATE OR REPLACE FUNCTION calculate_working_days(
  p_start_date DATE,
  p_end_date DATE,
  p_day_part_start day_part,
  p_day_part_end day_part,
  p_company_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_working_days DECIMAL := 0;
  v_current_date DATE;
  v_schedule RECORD;
  v_day_name TEXT;
  v_is_working_day BOOLEAN;
  v_is_bank_holiday BOOLEAN;
BEGIN
  -- Get the schedule (user-specific or company-wide)
  SELECT
    COALESCE(us.monday, cs.monday, TRUE) as monday,
    COALESCE(us.tuesday, cs.tuesday, TRUE) as tuesday,
    COALESCE(us.wednesday, cs.wednesday, TRUE) as wednesday,
    COALESCE(us.thursday, cs.thursday, TRUE) as thursday,
    COALESCE(us.friday, cs.friday, TRUE) as friday,
    COALESCE(us.saturday, cs.saturday, FALSE) as saturday,
    COALESCE(us.sunday, cs.sunday, FALSE) as sunday
  INTO v_schedule
  FROM companies c
  LEFT JOIN schedules cs ON cs.company_id = c.id
  LEFT JOIN schedules us ON us.user_id = p_user_id
  WHERE c.id = p_company_id
  LIMIT 1;

  -- Loop through each day in the range
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Get day name
    v_day_name := LOWER(TO_CHAR(v_current_date, 'Day'));
    v_day_name := TRIM(v_day_name);

    -- Check if working day
    v_is_working_day := CASE v_day_name
      WHEN 'monday' THEN v_schedule.monday
      WHEN 'tuesday' THEN v_schedule.tuesday
      WHEN 'wednesday' THEN v_schedule.wednesday
      WHEN 'thursday' THEN v_schedule.thursday
      WHEN 'friday' THEN v_schedule.friday
      WHEN 'saturday' THEN v_schedule.saturday
      WHEN 'sunday' THEN v_schedule.sunday
    END;

    -- Check if bank holiday
    SELECT EXISTS(
      SELECT 1 FROM bank_holidays
      WHERE company_id = p_company_id
        AND date = v_current_date
        AND deleted_at IS NULL
    ) INTO v_is_bank_holiday;

    -- Count if working day and not holiday
    IF v_is_working_day AND NOT v_is_bank_holiday THEN
      IF v_current_date = p_start_date AND p_day_part_start != 'all' THEN
        v_working_days := v_working_days + 0.5;
      ELSIF v_current_date = p_end_date AND p_day_part_end != 'all' THEN
        v_working_days := v_working_days + 0.5;
      ELSE
        v_working_days := v_working_days + 1;
      END IF;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_working_days;
END;
$$ LANGUAGE plpgsql STABLE;

```

**Key Changes**: Added support for day_part (half-days)

---

### 8.2 Calculate User Allowance Function

```sql
CREATE OR REPLACE FUNCTION calculate_user_allowance(
  p_user_id UUID,
  p_year INTEGER DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_user RECORD;
  v_year INTEGER;
  v_base_allowance DECIMAL;
  v_adjustment DECIMAL := 0;
  v_carried_over DECIMAL := 0;
  v_pro_rated_allowance DECIMAL;
  v_months_employed INTEGER;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));

  -- Get user and department information
  SELECT u.*, d.allowance as dept_allowance
  INTO v_user
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base allowance from department
  v_base_allowance := COALESCE(v_user.dept_allowance, 0);

  -- If department allowance is NULL, it means unlimited
  IF v_user.dept_allowance IS NULL THEN
    RETURN 9999; -- Return large number to indicate unlimited
  END IF;

  -- Pro-rate if user started mid-year
  IF EXTRACT(YEAR FROM v_user.start_date) = v_year THEN
    v_months_employed := 12 - EXTRACT(MONTH FROM v_user.start_date) + 1;
    v_pro_rated_allowance := (v_base_allowance / 12.0) * v_months_employed;
  ELSE
    v_pro_rated_allowance := v_base_allowance;
  END IF;

  -- Get manual adjustments and carry over for this year
  SELECT
    COALESCE(adjustment, 0),
    COALESCE(carried_over_allowance, 0)
  INTO v_adjustment, v_carried_over
  FROM user_allowance_adjustments
  WHERE user_id = p_user_id
    AND year = v_year
  LIMIT 1;

  RETURN v_pro_rated_allowance + v_adjustment + v_carried_over;
END;
$$ LANGUAGE plpgsql STABLE;

```

**Key Change**: Handle NULL allowance as unlimited

---

### 8.3 Get Approvers for Leave Request

```sql
CREATE OR REPLACE FUNCTION get_approvers_for_leave_request(
  p_user_id UUID,
  p_leave_request_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  approver_id UUID,
  role_id UUID,
  sequence_order INTEGER
) AS $$
BEGIN
  -- This is a simplified version
  -- Full implementation would need to evaluate:
  -- 1. User's roles, areas, teams
  -- 2. Project type
  -- 3. Approval rules matching criteria
  -- 4. Return ordered list of approvers

  RETURN QUERY
  SELECT DISTINCT
    ur.user_id as approver_id,
    ar.approver_role_id as role_id,
    ar.sequence_order
  FROM approval_rules ar
  JOIN user_role_area ura ON ura.role_id = ar.subject_role_id
  JOIN user_role_area ur_approver ON ur_approver.role_id = ar.approver_role_id
  WHERE ura.user_id = p_user_id
    AND ar.request_type = 'LEAVE'
  ORDER BY ar.sequence_order NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

```

**Purpose**: Determine who needs to approve a leave request based on complex rules

**Note**: Simplified version - full implementation would be more complex

---

### 8.4 Get Watchers for Leave Request

```sql
CREATE OR REPLACE FUNCTION get_watchers_for_leave_request(
  p_user_id UUID,
  p_leave_request_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  watcher_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ur.user_id
  FROM watcher_rules wr
  JOIN user_role_area ur ON ur.role_id = wr.role_id
  WHERE wr.request_type = 'LEAVE'
    AND ur.user_id != p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

```

**Purpose**: Determine who should be notified about a leave request

---

## 9. Views

### 9.1 User Allowance Summary View

```sql
CREATE OR REPLACE VIEW vw_user_allowance_summary AS
SELECT
  u.id as user_id,
  u.clerk_id,
  u.name || ' ' || u.lastname as full_name,
  u.company_id,
  u.department_id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as year,
  calculate_user_allowance(u.id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as total_allowance,
  (
    SELECT COALESCE(SUM(
      calculate_working_days(
        lr.date_start,
        lr.date_end,
        lr.day_part_start,
        lr.day_part_end,
        u.company_id,
        u.id
      )
    ), 0)
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.user_id = u.id
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.date_start) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND lt.use_allowance = TRUE
      AND lr.deleted_at IS NULL
  ) as used_allowance
FROM users u
WHERE u.deleted_at IS NULL
  AND u.activated = TRUE;

```

---

### 9.2 Pending Approvals View

```sql
CREATE OR REPLACE VIEW vw_pending_approvals AS
SELECT
  lr.id as leave_request_id,
  lr.user_id,
  u.name || ' ' || u.lastname as employee_name,
  u.email as employee_email,
  lr.date_start,
  lr.day_part_start,
  lr.date_end,
  lr.day_part_end,
  calculate_working_days(
    lr.date_start,
    lr.date_end,
    lr.day_part_start,
    lr.day_part_end,
    u.company_id,
    u.id
  ) as days_requested,
  lt.name as leave_type_name,
  lt.color as leave_type_color,
  lr.employee_comment,
  lr.created_at,
  d.id as department_id,
  d.name as department_name,
  u.company_id
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN departments d ON u.department_id = d.id
WHERE lr.status = 'new'
  AND lr.deleted_at IS NULL
  AND u.deleted_at IS NULL;

```

---

## 10. Data Migration from v1 to v2

### 10.1 Complete Table Mapping

| v1 Table | v2 Table | Migration Complexity | Notes |
| --- | --- | --- | --- |
| Companies | companies | Medium | Add UUID, map integration fields |
| Users | users | High | Add clerk_id, remove password, handle multi-role |
| Departments | departments | Low | UUID conversion, keep boss_id |
| DepartmentSupervisor | department_supervisor | Low | UUID conversion |
| LeaveTypes | leave_types | Low | Add auto_approve flag |
| Leaves | leave_requests | Medium | Status enum, day_part enum, calculate days |
| user_allowance_adjustment | user_allowance_adjustments | Low | Direct mapping |
| BankHolidays | bank_holidays | Low | Add country field |
| schedule | schedules | Low | Convert integer to boolean |
| Sessions | sessions | Low | Can deprecate |
| Roles | roles | Low | Direct mapping |
| Areas | areas | Low | Direct mapping |
| Teams | teams | Low | Direct mapping |
| Projects | projects | Low | Direct mapping |
| UserTeam | user_team | Low | UUID conversion |
| UserProject | user_project | Low | UUID conversion |
| UserRoleArea | user_role_area | Low | UUID conversion |
| ApprovalRules | approval_rules | Low | Direct mapping |
| ApprovalSteps | approval_steps | Medium | Status conversion |
| WatcherRules | watcher_rules | Low | Direct mapping |
| EmailAudit | email_audit | Low | Direct mapping |
| UserFeeds | user_feeds | Low | Direct mapping |
| comment | comments | Low | Direct mapping |
| audit | audit | Low | Direct mapping |
| SequelizeMeta | N/A | N/A | Not migrated (use Supabase migrations) |

---

### 10.2 Critical Data Transformations

**Status Enum Conversion (Leaves → leave_requests)**:

```sql
-- Legacy to v2 mapping
1 → 'new'
2 → 'approved'
3 → 'rejected'
4 → 'pended_revoke'
5 → 'canceled'

```

**Day Part Conversion**:

```sql
-- Legacy to v2 mapping
1 → 'all' (full day)
2 → 'morning'
3 → 'afternoon' (inferred, not explicitly in legacy)

```

**Schedule Day Conversion**:

```sql
-- Legacy to v2 mapping
1 → TRUE (working day)
2 → FALSE (non-working day)

```

**Clerk Integration**:

- Generate Clerk accounts for all users
- Map `user.id` → `user.clerk_id`
- Remove `password` field

---

## 11. Advanced Features Implementation Notes

### 11.1 Multi-Role Approval System

The application supports a sophisticated multi-role approval system:

1. **Roles** define organizational positions (PM, Tech Lead, Developer, etc.)
2. **Areas** define organizational areas (Front-end, Back-end, etc.)
3. **Projects** define work contexts (Project, Client, Internal)
4. **Users** can have multiple roles in different areas
5. **Approval Rules** define who must approve based on role/area/project combinations
6. **Approval Steps** track the actual approval process for each request
7. **Watchers** receive notifications without approving

**Example Workflow**:

- Developer in Back-end area requests leave on Client project
- Rule 1: Must be approved by PM in same area
- Rule 2: Then approved by Tech Lead
- Watcher: All PMs are notified

---

### 11.2 Flexible Allowance System

- Department allowance can be **NULL** (unlimited) or a number
- `is_accrued_allowance` flag indicates if allowance accrues over time
- Manual adjustments per user per year
- Carry-over allowance from previous year
- Pro-rated allowance for mid-year hires

---

### 11.3 Half-Day Support

- `day_part_start` and `day_part_end` support:
    - `all`: Full day
    - `morning`: Half day (morning)
    - `afternoon`: Half day (afternoon) - inferred capability
- Days calculation accounts for half-days

---

## 12. Implementation Priorities for v2

### Phase 1: Core Tables (Week 1)

1. companies
2. users (with Clerk integration)
3. departments
4. department_supervisor
5. leave_types
6. schedules

### Phase 2: Leave Management (Week 2)

1. leave_requests
2. user_allowance_adjustments
3. bank_holidays
4. Calculate working days function

### Phase 3: Advanced Structure (Week 3)

1. roles
2. areas
3. teams
4. projects
5. Junction tables (user_team, user_project, user_role_area)

### Phase 4: Approval System (Week 4)

1. approval_rules
2. approval_steps
3. watcher_rules
4. Approval functions

### Phase 5: Supporting Features (Week 5)

1. email_audit
2. user_feeds
3. comments
4. audit
5. Views

---

## 13. Key Differences from Original PRD

### Added Tables (10)

1. roles
2. areas
3. teams
4. projects
5. department_supervisor
6. user_team
7. user_project
8. user_role_area
9. approval_rules
10. approval_steps
11. watcher_rules

### Updated Tables

- **companies**: Added integration_api_enabled, integration_api_token, mode, company_wide_message
- **users**: Added country, contract_type, default_role_id; removed allowance fields
- **departments**: Made allowance nullable, added is_accrued_allowance, kept boss_id
- **leave_types**: Added auto_approve
- **leave_requests**: Added day_part fields, removed days_deducted (calculated)
- **bank_holidays**: Added country field

### Removed/Deprecated

- Schedules may be deprecated in favor of JSONB (but kept for legacy compatibility)
- Sessions will be replaced by Clerk
- days_deducted field (calculated on-the-fly)

---

## 14. Testing Requirements

### 14.1 Schema Validation

- [ ]  All tables created successfully
- [ ]  All foreign keys valid and enforced
- [ ]  All constraints working (CHECK, UNIQUE)
- [ ]  All indexes created and used by queries
- [ ]  All triggers functioning

### 14.2 Function Testing

- [ ]  calculate_working_days handles half-days correctly
- [ ]  calculate_working_days excludes weekends/holidays
- [ ]  calculate_user_allowance handles NULL (unlimited)
- [ ]  calculate_user_allowance pro-rates correctly
- [ ]  get_approvers returns correct approvers based on rules
- [ ]  get_watchers returns correct watchers

### 14.3 RLS Testing

- [ ]  Users see only their company data
- [ ]  Admins see all company data
- [ ]  Supervisors see department data
- [ ]  Multi-supervisor access works correctly
- [ ]  Cross-company data isolation enforced

### 14.4 Migration Testing

- [ ]  All v1 data migrates without loss
- [ ]  Status enums convert correctly
- [ ]  Day part enums convert correctly
- [ ]  Schedule booleans convert correctly
- [ ]  UUIDs generate uniquely
- [ ]  Relationships maintain integrity

---

## 15. Acceptance Criteria (UPDATED)

✅ All 23 tables from legacy database mapped to v2

✅ All relationships properly defined with foreign keys

✅ All constraints in place (including NULL allowance = unlimited)

✅ RLS policies for all tables

✅ Functions support half-days and complex allowance logic

✅ Multi-role approval system fully modeled

✅ Watcher notification system included

✅ Migration path defined for all legacy data

✅ Status/day_part enums properly mapped

✅ Flexible organizational structure (roles/areas/teams/projects)

---

## Document Change Log

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | 2026-01-08 | PM Team | Initial draft |
| 2.0 | 2026-01-09 | PM Team | Complete rewrite based on actual database analysis - added 11 missing tables, updated all table structures, added multi-role approval system |

---

*End of PRD 12 Part 2 - Database Schema*