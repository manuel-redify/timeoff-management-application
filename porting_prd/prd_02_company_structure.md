# PRD 02: Company & Organizational Structure

**Document Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Draft  
**Author:** Senior Product Manager  
**Related PRDs:** PRD 00 (Overview), PRD 01 (User Management), PRD 04 (Leave Workflow), PRD 06 (Allowance Management), PRD 12 (Database Schema)

---

## Executive Summary

This PRD defines the comprehensive requirements for company and organizational structure management in TimeOff Management Application v2. This includes company settings, department hierarchy, working schedules, public holidays, and organizational configuration that forms the foundation for absence management.

### Business Context

Organizational structure is critical for:
- Defining company-wide policies and settings
- Organizing employees into departments for reporting and approval workflows
- Managing working schedules (company-wide and individual)
- Tracking public holidays and company-specific days off
- Configuring timezone, date formats, and regional settings

### Goals and Objectives

1. **Flexible Company Configuration**: Support diverse organizational needs and regional requirements
2. **Department Management**: Enable hierarchical organization with supervisor assignments
3. **Schedule Customization**: Allow company-wide and individual working schedules
4. **Holiday Management**: Track public holidays and company-specific days off
5. **Regional Adaptation**: Support multiple countries, timezones, and date formats
6. **Migration Path**: Enable smooth transition from v1's company structure

### Success Criteria

- All v1 company settings supported in v2
- Department hierarchy functions correctly with supervisor assignments
- Working schedules (company and individual) calculate allowances accurately
- Public holidays integrate with leave calculations
- Regional settings (timezone, date format) work across all features
- Data migration from v1 preserves all organizational structure
- Company settings update in real-time across the application

---

## 1. Company Management

### 1.1 Company Registration

#### FR-CM-001: Company Creation
**Priority:** Critical  
**Description:** Create new company during initial registration

**Requirements:**
- Company created automatically during first user registration (see PRD 01)
- Company properties initialized:
  - `name`: Company name (from registration form)
  - `country`: Country code (2-letter ISO, e.g., "UK", "US")
  - `timezone`: Timezone (e.g., "Europe/London", "America/New_York")
  - `start_of_new_year`: Month when leave year starts (1-12, default: 1 for January)
  - `date_format`: Date display format (default: "YYYY-MM-DD")
  - `share_all_absences`: Whether employees can see all absences (default: false)
  - `is_team_view_hidden`: Hide team view from non-admin users (default: false)
  - `carry_over`: Days carried over to next year (0-20 or 1000 for "All", default: 0)
  - `mode`: Company mode (1=normal, 2=read-only holidays, default: 1)
  - `integration_api_enabled`: API access enabled (default: false)
  - `integration_api_token`: UUID for API authentication (auto-generated)
  - `company_wide_message`: Optional message shown to all users (default: null)
- Automatic creation of default structures:
  - One default department (name: "Sales" or customizable)
  - Default leave types (Vacation, Sick Leave, etc.)
  - Public holidays based on country
  - Company-wide schedule (Mon-Fri working days)
- First user becomes admin and department supervisor
- Transaction-based creation (all-or-nothing)

**Acceptance Criteria:**
- Company created atomically with all defaults
- Default department, leave types, and holidays generated
- First user assigned as admin and supervisor
- Company settings accessible immediately

#### FR-CM-002: Company Settings Management
**Priority:** Critical  
**Description:** Administrators can update company settings

**Requirements:**
- Admin-only access to company settings
- Editable fields:
  - Company name
  - Country code (affects default holidays)
  - Timezone (affects "today" calculations)
  - Date format (affects UI display)
  - Start of new year (month 1-12)
  - Share all absences (boolean)
  - Hide team view (boolean)
  - Carry over days (0-20 or 1000)
  - Company-wide message (text, optional)
- Validation:
  - Country code must be valid 2-letter ISO code
  - Timezone must be valid IANA timezone
  - Date format must be from allowed list
  - Start of year must be 1-12
  - Carry over must be 0-20 or 1000
- Changes take effect immediately
- Audit log entry created for changes
- Timezone changes affect all date calculations going forward

**Acceptance Criteria:**
- Admin can update all company settings
- Validation prevents invalid values
- Changes reflected immediately across application
- Audit trail maintained

### 1.2 Company-Wide Settings

#### FR-CM-003: Date Format Configuration
**Priority:** High  
**Description:** Configure how dates are displayed throughout the application

**Requirements:**
- Supported date formats:
  - `YYYY-MM-DD` (ISO format, default)
  - `YYYY/MM/DD`
  - `DD MMM, YY` (e.g., "25 Dec, 24")
  - `DD/MM/YY`
  - `DD/MM/YYYY`
  - `MM/DD/YY` (US format)
- Format applies to:
  - All date displays in UI
  - Date pickers
  - Reports and exports
  - Email notifications
- Internal storage always in ISO format (YYYY-MM-DD)
- Date parsing respects company format
- Format selection via dropdown

**Acceptance Criteria:**
- All supported formats display correctly
- Date pickers use company format
- Internal storage remains ISO format
- Format changes apply immediately

#### FR-CM-004: Timezone Configuration
**Priority:** High  
**Description:** Set company timezone for accurate date calculations

**Requirements:**
- Timezone dropdown with all IANA timezones
- Common timezones grouped at top:
  - Europe/London
  - America/New_York
  - America/Los_Angeles
  - Europe/Paris
  - Asia/Tokyo
  - Australia/Sydney
- Timezone affects:
  - "Today" calculation for leave requests
  - Leave year boundaries
  - Report date ranges
  - Email timestamps
- All dates stored in UTC internally
- Timezone conversion for display and calculations
- Changing timezone does not affect historical data

**Acceptance Criteria:**
- All IANA timezones available
- "Today" calculated correctly in company timezone
- Historical data unaffected by timezone changes
- Timezone displays in settings

#### FR-CM-005: Leave Year Configuration
**Priority:** High  
**Description:** Define when the leave year starts

**Requirements:**
- `start_of_new_year` field (integer 1-12)
- Represents month when leave year begins:
  - 1 = January (default, calendar year)
  - 4 = April (UK tax year)
  - 7 = July (mid-year)
  - etc.
- Affects:
  - Allowance calculations
  - Carry-over logic
  - Annual reports
  - Leave year display
- Cannot be changed if there are approved leaves in current year (warning)
- Changing value requires admin confirmation

**Acceptance Criteria:**
- Leave year start month configurable
- Allowance calculations respect leave year
- Warning shown if leaves exist
- Confirmation required for changes

#### FR-CM-006: Absence Visibility Settings
**Priority:** Medium  
**Description:** Control who can see employee absences

**Requirements:**
- `share_all_absences` setting (boolean):
  - `true`: All employees can see all absences in calendar
  - `false`: Employees only see own absences and team absences (if team view enabled)
- `is_team_view_hidden` setting (boolean):
  - `true`: Team view hidden from non-admin users
  - `false`: Team view accessible to all users (default)
- Settings work together:
  - If `share_all_absences = true`: All users see all absences
  - If `share_all_absences = false` AND `is_team_view_hidden = false`: Users see team absences
  - If `share_all_absences = false` AND `is_team_view_hidden = true`: Users only see own absences
- Supervisors always see supervised team absences regardless of settings
- Admins always see all absences

**Acceptance Criteria:**
- Settings control absence visibility correctly
- Supervisors always see team absences
- Admins always see all absences
- Settings documented clearly in UI

#### FR-CM-007: Carry-Over Configuration
**Priority:** High  
**Description:** Define how unused allowance carries over to next year

**Requirements:**
- `carry_over` field (integer):
  - `0`: No carry-over (default)
  - `1-20`: Specific number of days carried over
  - `1000`: All unused days carried over (special value)
- Carry-over options presented as:
  - "None" (0)
  - "1 day", "2 days", ... "20 days"
  - "All" (1000)
- Carry-over calculation:
  - At leave year boundary, calculate unused allowance
  - Add carry-over amount (up to limit) to next year's allowance
  - If "All", carry over entire unused balance
- Manual carry-over trigger:
  - Admin can manually trigger carry-over calculation
  - Processes all users in company
  - Creates allowance adjustments for next year
  - Confirmation required
- Carry-over respects leave year start date

**Acceptance Criteria:**
- Carry-over options selectable
- Automatic carry-over at year boundary
- Manual carry-over trigger works
- Carry-over amounts calculated correctly

#### FR-CM-008: Company-Wide Message
**Priority:** Low  
**Description:** Display message to all company users

**Requirements:**
- `company_wide_message` field (text, optional)
- Message displayed:
  - On dashboard/home page
  - As banner or alert
  - To all users in company
- Use cases:
  - Announcements
  - Policy changes
  - System maintenance notices
  - Holiday reminders
- Message supports:
  - Plain text
  - Line breaks
  - Up to 1000 characters
- Admin can set, update, or clear message
- Message displayed until cleared

**Acceptance Criteria:**
- Message displayed to all users
- Admin can set/update/clear message
- Message persists until cleared
- Character limit enforced

#### FR-CM-009: Company Mode
**Priority:** Medium  
**Description:** Set company operational mode

**Requirements:**
- `mode` field (integer):
  - `1`: Normal mode (default) - full functionality
  - `2`: Read-only holidays mode - users can only view absences, not create new requests
- Mode affects:
  - Leave request creation (disabled in mode 2)
  - Leave request editing (disabled in mode 2)
  - Calendar viewing (always enabled)
  - Reports (always enabled)
- Use case for mode 2:
  - Company transitioning to new system
  - Historical data viewing only
  - Temporary freeze on new requests
- Admin can switch modes
- Warning shown when switching to mode 2
- Existing pending requests unaffected

**Acceptance Criteria:**
- Mode 1 allows full functionality
- Mode 2 disables leave request creation
- Mode switch requires confirmation
- Existing requests unaffected

### 1.3 Integration API

#### FR-CM-010: Integration API Configuration
**Priority:** Low  
**Description:** Enable external API access to company data

**Requirements:**
- `integration_api_enabled` field (boolean, default: false)
- `integration_api_token` field (UUID, auto-generated)
- Admin can:
  - Enable/disable API access
  - View current API token
  - Regenerate API token
- Token regeneration:
  - Generates new UUID
  - Invalidates old token immediately
  - Requires confirmation
- API token used for:
  - External system integration
  - Programmatic access to leave data
  - Third-party applications
- Security:
  - Token must be kept secret
  - HTTPS only for API calls
  - Token in Authorization header
- API endpoints (defined in PRD 13)

**Acceptance Criteria:**
- API can be enabled/disabled
- Token can be viewed and regenerated
- Token authentication works
- Token regeneration invalidates old token

### 1.4 Company Deletion

#### FR-CM-011: Company Deletion
**Priority:** Medium  
**Description:** Permanently delete company and all related data

**Requirements:**
- Admin-only function
- Confirmation required:
  - Admin must type company name exactly
  - Warning about permanent deletion
  - List of data to be deleted
- Cascading deletion:
  - All users
  - All departments
  - All leave types
  - All leave requests
  - All schedules
  - All bank holidays
  - All audit logs
  - All email audit records
- Deletion is permanent and irreversible
- User logged out after deletion
- Redirect to homepage
- Audit log entry created before deletion (external system)

**Acceptance Criteria:**
- Confirmation prevents accidental deletion
- All related data deleted
- User logged out
- Deletion is permanent

---

## 2. Department Management

### 2.1 Department Structure

#### FR-DM-001: Department Creation
**Priority:** Critical  
**Description:** Create organizational departments

**Requirements:**
- Admin can create departments
- Department properties:
  - `name`: Department name (required, string)
  - `companyId`: Company association (automatic)
  - `allowance`: Annual leave allowance in days (optional, overrides company default)
  - `bossId`: Department supervisor/manager (required, foreign key to User)
  - `include_public_holidays`: Include public holidays in allowance calculations (boolean, default: true)
  - `is_accrued_allowance`: Allowance accrues monthly vs. granted upfront (boolean, default: false)
- Allowance options:
  - `null`: Unlimited allowance
  - `0`: No allowance (department doesn't get leave)
  - `0.5 - 50`: Specific days (in 0.5 increments)
- Department boss:
  - Must be user from same company
  - Can be any user (admin, supervisor, or employee)
  - Automatically becomes supervisor for department
- Default department created during company registration
- Multiple departments allowed per company
- Department names must be unique per company

**Acceptance Criteria:**
- Admin can create departments
- Department properties validated
- Boss must be valid user
- Department names unique per company

#### FR-DM-002: Department Editing
**Priority:** High  
**Description:** Update department properties

**Requirements:**
- Admin can edit all department fields:
  - Name
  - Allowance
  - Boss (supervisor)
  - Include public holidays
  - Is accrued allowance
- Validation:
  - Name cannot be empty
  - Allowance must be null, 0, or 0.5-50
  - Boss must be valid user from company
- Changing allowance:
  - Affects future allowance calculations
  - Does not retroactively change existing allowances
  - Warning shown if users exist in department
- Changing boss:
  - Old boss loses supervisor privileges for department
  - New boss gains supervisor privileges
  - Pending approvals remain with old boss (or reassigned)
- Changes logged in audit trail

**Acceptance Criteria:**
- All fields editable
- Validation prevents invalid data
- Allowance changes affect future calculations
- Boss changes update permissions

#### FR-DM-003: Department Deletion
**Priority:** Medium  
**Description:** Remove departments from company

**Requirements:**
- Admin can delete departments
- Deletion restrictions:
  - Cannot delete if department has users
  - Cannot delete last department in company
- Deletion process:
  - Confirmation dialog required
  - Must move users to another department first
  - Cascading deletion:
    - Department supervisor assignments
    - Department-specific schedules (if any)
- Error messages:
  - "Cannot delete department with users" (show user count)
  - "Cannot delete last department"
- Deletion logged in audit trail

**Acceptance Criteria:**
- Empty departments can be deleted
- Departments with users cannot be deleted
- Last department cannot be deleted
- Confirmation required

### 2.2 Supervisor Management

#### FR-DM-004: Department Boss (Primary Supervisor)
**Priority:** Critical  
**Description:** Assign primary supervisor to department

**Requirements:**
- Each department has one `bossId` (primary supervisor)
- Boss responsibilities:
  - Approve/reject leave requests from department users
  - View team calendar for department
  - View allowances for department users
  - Manage department users (if admin)
- Boss selection:
  - Dropdown of all company users
  - Can select any user (even from different department)
  - Cannot be empty (required field)
- Boss permissions:
  - Automatically granted supervisor access for department
  - Can approve own leave requests if also admin
  - Cannot approve own requests if not admin
- Changing boss:
  - Old boss retains supervisor role if assigned as secondary supervisor
  - New boss immediately gains supervisor access
  - Pending approvals handled per workflow rules

**Acceptance Criteria:**
- Boss required for each department
- Boss has supervisor permissions
- Boss can approve department requests
- Boss change updates permissions immediately

#### FR-DM-005: Secondary Supervisors
**Priority:** High  
**Description:** Assign additional supervisors to department

**Requirements:**
- Departments can have multiple secondary supervisors
- Secondary supervisors stored in `DepartmentSupervisor` join table:
  - `department_id`: Department reference
  - `user_id`: User reference
- Secondary supervisor capabilities:
  - Same as department boss
  - Approve/reject leave requests
  - View team calendar
  - View team allowances
- Secondary supervisor management:
  - Admin can add multiple supervisors
  - Admin can remove supervisors
  - Multi-select interface for adding supervisors
  - List of current supervisors with remove buttons
- Supervisor selection:
  - Shows all company users except current boss
  - Can select multiple users at once
  - Users can be from any department
- Removing supervisors:
  - Confirmation required
  - Cannot remove if supervisor has pending approvals (warning)
  - Supervisor loses access immediately

**Acceptance Criteria:**
- Multiple secondary supervisors can be assigned
- Secondary supervisors have same permissions as boss
- Supervisors can be added and removed
- Removal requires confirmation

#### FR-DM-006: Supervisor List View
**Priority:** Medium  
**Description:** View all supervisors for a department

**Requirements:**
- Department details page shows:
  - Primary supervisor (boss) - highlighted
  - List of secondary supervisors
  - Remove button for each secondary supervisor
  - "Add Supervisors" button
- Supervisor display:
  - Name
  - Email
  - Department (their own department)
  - Role indicator (Primary/Secondary)
- Add supervisors modal:
  - Checkbox list of available users
  - Excludes current boss
  - Excludes already-assigned secondary supervisors
  - Multi-select capability
  - "Add Selected" button
- Remove supervisor:
  - Inline remove button (X icon)
  - Confirmation dialog
  - Immediate removal on confirm

**Acceptance Criteria:**
- All supervisors displayed
- Primary supervisor clearly marked
- Add/remove functionality works
- UI intuitive and responsive

### 2.3 Department Allowance

#### FR-DM-007: Department-Specific Allowance
**Priority:** High  
**Description:** Override company-wide allowance at department level

**Requirements:**
- Department `allowance` field overrides company default
- Allowance values:
  - `null`: Unlimited (no cap on leave requests)
  - `0`: No allowance (department gets no leave)
  - `0.5 - 50`: Specific days in 0.5 increments
- Allowance calculation priority:
  1. User-specific allowance adjustment (if any)
  2. Department allowance (if set)
  3. Company default allowance
- Allowance display:
  - Dropdown with options: "Unlimited", "None", "0.5", "1", "1.5", ... "50"
  - Current value pre-selected
- Changing department allowance:
  - Affects new users joining department
  - Affects allowance calculations for existing users (next year)
  - Does not retroactively change current year allowances
  - Warning shown if users exist

**Acceptance Criteria:**
- Department allowance overrides company default
- Allowance options selectable
- Changes affect future calculations
- Warning shown for existing users

#### FR-DM-008: Accrued Allowance
**Priority:** Medium  
**Description:** Allowance accrues monthly instead of granted upfront

**Requirements:**
- `is_accrued_allowance` field (boolean, default: false)
- Accrual behavior:
  - `false`: Full annual allowance granted on leave year start (default)
  - `true`: Allowance accrues monthly (1/12 of annual allowance per month)
- Accrual calculation:
  - Annual allowance / 12 = monthly accrual
  - Accrued amount = (months worked in current year) × monthly accrual
  - Rounds to 1 decimal place
- Use cases:
  - New employees (don't get full allowance immediately)
  - Contractors (accrual based on time worked)
  - Probationary periods
- Accrual display:
  - Show "Accrued to date" vs. "Annual allowance"
  - Update monthly
- Accrual applies to all users in department
- Can be toggled on/off by admin

**Acceptance Criteria:**
- Accrued allowance calculates monthly
- Display shows accrued vs. annual
- Toggle works correctly
- Calculation accurate

#### FR-DM-009: Public Holiday Inclusion
**Priority:** High  
**Description:** Control whether public holidays count against department allowance

**Requirements:**
- `include_public_holidays` field (boolean, default: true)
- Behavior:
  - `true`: Public holidays are separate from leave allowance (default)
    - Public holidays don't deduct from allowance
    - Employees get public holidays "for free"
  - `false`: Public holidays count against leave allowance
    - Public holidays deduct from allowance
    - Employees must "use" allowance for public holidays
- Affects:
  - Allowance calculations
  - Leave request validation
  - Calendar display
  - Reports
- Use cases:
  - `true`: Most companies (public holidays are separate)
  - `false`: Contractors or flexible schedules (all days off count)
- Setting applies to entire department
- Can be changed by admin

**Acceptance Criteria:**
- Setting controls public holiday behavior
- Allowance calculations respect setting
- Calendar displays correctly
- Reports accurate

---

## 3. Working Schedules

### 3.1 Company-Wide Schedule

#### FR-WS-001: Default Company Schedule
**Priority:** Critical  
**Description:** Define company-wide working days

**Requirements:**
- Company has one default schedule
- Schedule stored in `Schedule` table:
  - `company_id`: Company reference (not null)
  - `user_id`: null (indicates company-wide)
  - `monday` through `sunday`: Working day flags
- Working day values:
  - `1`: Works whole day (default for Mon-Fri)
  - `2`: Does not work (default for Sat-Sun)
  - `3`: Works morning only (future enhancement)
  - `4`: Works afternoon only (future enhancement)
- Default schedule:
  - Monday-Friday: Working days (1)
  - Saturday-Sunday: Non-working days (2)
- Schedule created automatically with company
- If no schedule exists, default is generated on-the-fly

**Acceptance Criteria:**
- Company has default schedule
- Default is Mon-Fri working
- Schedule created with company
- Default generated if missing

#### FR-WS-002: Edit Company Schedule
**Priority:** High  
**Description:** Administrators can modify company-wide schedule

**Requirements:**
- Admin can edit company schedule
- Schedule editor shows:
  - Checkbox for each day of week
  - Checked = working day
  - Unchecked = non-working day
- Schedule changes affect:
  - Allowance calculations (working days only)
  - Leave request validation
  - Calendar display
  - All users without individual schedules
- Common schedules:
  - Mon-Fri (5-day week, default)
  - Mon-Sat (6-day week)
  - Sun-Thu (Middle East)
  - Custom combinations
- Changes take effect immediately
- Changes do not affect historical leave calculations
- Warning shown if changing schedule with active users

**Acceptance Criteria:**
- Admin can edit schedule
- All days configurable
- Changes affect allowance calculations
- Warning shown for active users

### 3.2 Individual User Schedules

#### FR-WS-003: User-Specific Schedule
**Priority:** High  
**Description:** Override company schedule for individual users

**Requirements:**
- Users can have individual schedules
- User schedule stored in `Schedule` table:
  - `user_id`: User reference (not null)
  - `company_id`: null (indicates user-specific)
  - `monday` through `sunday`: Working day flags
- User schedule overrides company schedule
- Use cases:
  - Part-time employees (e.g., Mon-Wed only)
  - Flexible schedules
  - Different working patterns
  - Contractors with custom hours
- Schedule priority:
  1. User-specific schedule (if exists)
  2. Company-wide schedule (default)
- Admin can create user schedules
- User cannot edit own schedule

**Acceptance Criteria:**
- User schedules override company schedule
- Admin can create user schedules
- User schedule affects allowance calculations
- Schedule stored correctly

#### FR-WS-004: Edit User Schedule
**Priority:** High  
**Description:** Administrators can modify user-specific schedules

**Requirements:**
- Admin can edit user schedule from user profile page
- Schedule editor same as company schedule:
  - Checkbox for each day
  - Checked = working day
  - Unchecked = non-working day
- Additional option:
  - "Use company schedule" checkbox
  - When checked, deletes user-specific schedule
  - User reverts to company schedule
- Schedule changes affect:
  - User's allowance calculations
  - User's leave request validation
  - User's calendar display
- Changes take effect immediately
- Changes do not affect historical calculations
- Warning shown if user has pending/approved leaves

**Acceptance Criteria:**
- Admin can edit user schedule
- "Use company schedule" option works
- Changes affect user calculations
- Warning shown for existing leaves

#### FR-WS-005: Schedule Display
**Priority:** Medium  
**Description:** Display schedule information to users

**Requirements:**
- User profile shows:
  - Current schedule (company or individual)
  - Working days highlighted
  - Non-working days grayed out
- Schedule display format:
  - Visual calendar week (Mon-Sun)
  - Checkmarks or colors for working days
  - Clear indication if using company vs. individual schedule
- Admin views:
  - Can see all user schedules
  - Can see company schedule
  - Can compare schedules
- Employee views:
  - Can see own schedule (read-only)
  - Can see company schedule
  - Cannot edit

**Acceptance Criteria:**
- Schedule displayed clearly
- Company vs. individual schedule indicated
- Visual representation intuitive
- Read-only for employees

### 3.3 Schedule Validation

#### FR-WS-006: Schedule Business Rules
**Priority:** High  
**Description:** Enforce schedule constraints

**Requirements:**
- Schedule validation:
  - At least one working day required (cannot have all days off)
  - Cannot have more than 7 working days (obviously)
  - Schedule must be associated with company OR user, not both
  - Schedule must be associated with company OR user, not neither
- Database constraints:
  - `company_id` XOR `user_id` (exactly one must be set)
  - Validation at model level
- Error messages:
  - "Schedule must have at least one working day"
  - "Schedule must be associated with company or user"
- Schedule deletion:
  - User-specific schedules can be deleted (user reverts to company schedule)
  - Company schedule cannot be deleted (can only be edited)

**Acceptance Criteria:**
- At least one working day required
- XOR constraint enforced
- Error messages clear
- Deletion rules enforced

---

## 4. Public Holidays (Bank Holidays)

### 4.1 Holiday Management

#### FR-PH-001: Public Holiday Creation
**Priority:** High  
**Description:** Define public holidays for the company

**Requirements:**
- Admin can create public holidays
- Holiday properties:
  - `name`: Holiday name (required, string)
  - `date`: Holiday date (required, date)
  - `companyId`: Company association (automatic)
  - `country`: Country code (optional, 2-letter ISO, default: company country)
- Holiday creation:
  - Manual entry (one at a time)
  - Bulk import from predefined list
  - CSV import (future enhancement)
- Default holidays:
  - Generated automatically during company creation
  - Based on company country
  - Predefined list for common countries (UK, US, etc.)
- Holiday validation:
  - Date must be valid
  - Name cannot be empty
  - Duplicate dates allowed (different countries)
- Holidays can span multiple years

**Acceptance Criteria:**
- Admin can create holidays
- Default holidays generated on company creation
- Validation prevents invalid data
- Multiple years supported

#### FR-PH-002: Public Holiday Editing
**Priority:** Medium  
**Description:** Update existing public holidays

**Requirements:**
- Admin can edit holidays:
  - Name
  - Date
  - Country
- Editing restrictions:
  - Cannot change company association
  - Cannot change if leave requests exist on that date (warning)
- Changes affect:
  - Calendar display
  - Leave calculations (if `include_public_holidays` is true)
  - Allowance calculations
- Changes take effect immediately
- Warning shown if leaves exist on date

**Acceptance Criteria:**
- Admin can edit holiday details
- Warning shown for existing leaves
- Changes reflected immediately
- Company association immutable

#### FR-PH-003: Public Holiday Deletion
**Priority:** Medium  
**Description:** Remove public holidays

**Requirements:**
- Admin can delete holidays
- Deletion restrictions:
  - Warning if leave requests exist on that date
  - Confirmation required
- Deletion affects:
  - Calendar display (holiday removed)
  - Leave calculations (day becomes working day if scheduled)
  - Allowance calculations
- Cascading effects:
  - Leaves on that date remain valid
  - Allowance recalculated if needed
- Deletion logged in audit trail

**Acceptance Criteria:**
- Admin can delete holidays
- Warning shown for existing leaves
- Confirmation required
- Deletion logged

### 4.2 Holiday Display

#### FR-PH-004: Holiday List View
**Priority:** High  
**Description:** View all company public holidays

**Requirements:**
- Holiday list page shows:
  - All holidays for company
  - Sorted by date (ascending)
  - Columns: Date, Name, Country, Actions
- Filtering:
  - By year
  - By country (if multi-country)
- Actions:
  - Edit holiday (inline or modal)
  - Delete holiday (with confirmation)
  - Add new holiday
- Pagination:
  - 50 holidays per page
  - Year-based navigation
- Display format:
  - Date in company date format
  - Country flag icon (optional)
  - Color coding by country (optional)

**Acceptance Criteria:**
- All holidays displayed
- Sorted by date
- Filtering works
- Actions functional

#### FR-PH-005: Holiday Calendar Integration
**Priority:** High  
**Description:** Display holidays in calendar views

**Requirements:**
- Holidays shown in:
  - Personal calendar
  - Team calendar
  - Company calendar
  - Wall chart
- Holiday display:
  - Different color/style from leave requests
  - Holiday name shown
  - Non-clickable (informational only)
  - Applies to all users (if country matches)
- Country filtering:
  - If user has country set, show holidays for that country
  - If user has no country, show holidays for company country
  - If department has country-specific settings, respect that
- Holiday behavior:
  - If `include_public_holidays = true`: Holiday doesn't count against allowance
  - If `include_public_holidays = false`: Holiday counts as working day (user must request leave)

**Acceptance Criteria:**
- Holidays displayed in all calendar views
- Different styling from leave requests
- Country filtering works
- Allowance behavior correct

### 4.3 Country-Specific Holidays

#### FR-PH-006: Multi-Country Holiday Support
**Priority:** Medium  
**Description:** Support holidays for multiple countries

**Requirements:**
- Each holiday has optional `country` field
- Use cases:
  - Multi-national companies
  - Remote teams in different countries
  - Departments in different locations
- Holiday matching:
  - User's country (if set) matches holiday country
  - If no user country, use company country
  - If holiday has no country, applies to all users
- Holiday display:
  - Users only see holidays for their country
  - Admins see all holidays (with country indicator)
- Predefined holiday lists:
  - UK holidays
  - US holidays
  - EU countries
  - Other common countries
- Admin can:
  - Import holidays for specific country
  - Create custom holidays for any country
  - Edit country for existing holidays

**Acceptance Criteria:**
- Holidays can be country-specific
- Users see relevant holidays only
- Admins see all holidays
- Country matching works correctly

#### FR-PH-007: Default Holiday Generation
**Priority:** High  
**Description:** Auto-generate holidays based on country

**Requirements:**
- During company creation:
  - Generate holidays for company country
  - Use predefined list for current year + next year
- Predefined lists include:
  - UK: New Year's Day, Good Friday, Easter Monday, Early May, Spring Bank Holiday, Summer Bank Holiday, Christmas, Boxing Day
  - US: New Year's Day, MLK Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas
  - Other countries as needed
- Holiday generation:
  - Triggered automatically on company creation
  - Can be triggered manually by admin (for new year)
  - Skips holidays that already exist (no duplicates)
- Admin can:
  - Regenerate holidays for new year
  - Import holidays for different country
  - Clear all holidays (with confirmation)

**Acceptance Criteria:**
- Holidays auto-generated on company creation
- Predefined lists accurate
- Manual regeneration works
- No duplicate holidays created

---

## 5. User Stories

### 5.1 Company Setup

**US-001: Initial Company Setup**
```
As a new company administrator
I want to configure company settings during registration
So that the system matches our organizational needs

Acceptance Criteria:
- I can set company name, country, and timezone
- Default department is created automatically
- Default holidays are generated for my country
- I can see the company settings page
- Settings are saved successfully
```

**US-002: Update Company Settings**
```
As an administrator
I want to update company settings
So that I can adapt to changing business needs

Acceptance Criteria:
- I can access company settings page
- I can change company name, country, timezone, date format
- I can configure absence visibility settings
- I can set carry-over policy
- Changes are saved and take effect immediately
- I see confirmation message
```

### 5.2 Department Management

**US-003: Create Department**
```
As an administrator
I want to create a new department
So that I can organize employees by team

Acceptance Criteria:
- I can access department creation form
- I can enter department name
- I can set department allowance (optional)
- I can assign a department supervisor
- I can configure public holiday inclusion
- Department is created successfully
- Department appears in department list
```

**US-004: Assign Supervisors**
```
As an administrator
I want to assign multiple supervisors to a department
So that approval responsibilities can be shared

Acceptance Criteria:
- I can view current department supervisors
- I can add secondary supervisors
- I can select multiple users at once
- I can remove supervisors
- Supervisors gain approval permissions immediately
- Changes are saved successfully
```

**US-005: Edit Department Allowance**
```
As an administrator
I want to set department-specific allowances
So that different teams can have different leave policies

Acceptance Criteria:
- I can edit department allowance
- I can choose from Unlimited, None, or specific days
- I can toggle accrued allowance
- I can toggle public holiday inclusion
- Changes affect future allowance calculations
- I see warning if users exist in department
```

### 5.3 Working Schedules

**US-006: Configure Company Schedule**
```
As an administrator
I want to set company-wide working days
So that leave calculations are accurate

Acceptance Criteria:
- I can access schedule settings
- I can select working days (Mon-Sun)
- I can save schedule changes
- Changes affect all users without individual schedules
- I see confirmation message
```

**US-007: Set Individual Schedule**
```
As an administrator
I want to set custom working schedules for part-time employees
So that their allowances are calculated correctly

Acceptance Criteria:
- I can access user schedule from user profile
- I can select working days for the user
- I can revert to company schedule
- Changes affect user's allowance calculations
- I see confirmation message
```

### 5.4 Public Holidays

**US-008: Manage Public Holidays**
```
As an administrator
I want to manage public holidays
So that employees know which days are company holidays

Acceptance Criteria:
- I can view list of all holidays
- I can add new holidays
- I can edit existing holidays
- I can delete holidays
- Holidays appear in calendar views
- Changes are saved successfully
```

**US-009: Import Country Holidays**
```
As an administrator
I want to import holidays for a specific country
So that I don't have to enter them manually

Acceptance Criteria:
- I can select a country
- I can select a year
- System generates holidays for that country/year
- Holidays appear in holiday list
- I can review and edit imported holidays
```

### 5.5 Multi-Country Support

**US-010: View Relevant Holidays**
```
As an employee in a specific country
I want to see holidays relevant to my location
So that I know which days I have off

Acceptance Criteria:
- I see holidays for my country in calendar
- I don't see holidays for other countries
- If no country set, I see company country holidays
- Holidays are clearly marked in calendar
```

---

## 6. Technical Specifications

### 6.1 Database Schema

#### Company Table
```typescript
interface Company {
  id: string; // UUID primary key
  name: string; // Company name
  country: string; // 2-letter ISO country code
  timezone: string; // IANA timezone
  start_of_new_year: number; // 1-12 (month)
  date_format: string; // Date format string
  share_all_absences: boolean; // Visibility setting
  is_team_view_hidden: boolean; // Team view visibility
  carry_over: number; // 0-20 or 1000
  mode: number; // 1=normal, 2=read-only
  company_wide_message: string | null; // Optional message
  integration_api_enabled: boolean; // API access
  integration_api_token: string; // UUID for API
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### Department Table
```typescript
interface Department {
  id: string; // UUID primary key
  name: string; // Department name
  company_id: string; // Foreign key to Company
  boss_id: string; // Foreign key to User (primary supervisor)
  allowance: number | null; // null=unlimited, 0=none, 0.5-50=days
  include_public_holidays: boolean; // Default: true
  is_accrued_allowance: boolean; // Default: false
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### DepartmentSupervisor Table (Join Table)
```typescript
interface DepartmentSupervisor {
  id: string; // UUID primary key
  department_id: string; // Foreign key to Department
  user_id: string; // Foreign key to User
  created_at: timestamp;
}
```

#### Schedule Table
```typescript
interface Schedule {
  id: string; // UUID primary key
  company_id: string | null; // Foreign key to Company (XOR with user_id)
  user_id: string | null; // Foreign key to User (XOR with company_id)
  monday: number; // 1=works, 2=off, 3=morning, 4=afternoon
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### BankHoliday Table
```typescript
interface BankHoliday {
  id: string; // UUID primary key
  name: string; // Holiday name
  date: Date; // Holiday date
  country: string; // 2-letter ISO country code
  company_id: string; // Foreign key to Company
  created_at: timestamp;
  updated_at: timestamp;
}
```

### 6.2 Supabase RLS Policies

#### Company Table Policies
```sql
-- Users can read their own company
CREATE POLICY "Users can read own company"
  ON companies FOR SELECT
  USING (id = (SELECT company_id FROM users WHERE clerk_id = auth.uid()));

-- Admins can update their company
CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  USING (
    id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );

-- Admins can delete their company
CREATE POLICY "Admins can delete own company"
  ON companies FOR DELETE
  USING (
    id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );
```

#### Department Table Policies
```sql
-- Users can read departments in their company
CREATE POLICY "Users can read company departments"
  ON departments FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid()));

-- Admins can insert departments
CREATE POLICY "Admins can create departments"
  ON departments FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );

-- Admins can update departments
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );

-- Admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );
```

#### Schedule Table Policies
```sql
-- Users can read company schedule
CREATE POLICY "Users can read company schedule"
  ON schedules FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    OR user_id = (SELECT id FROM users WHERE clerk_id = auth.uid())
  );

-- Admins can manage schedules
CREATE POLICY "Admins can manage schedules"
  ON schedules FOR ALL
  USING (
    (company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
     OR user_id IN (SELECT id FROM users WHERE company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())))
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );
```

#### BankHoliday Table Policies
```sql
-- Users can read company holidays
CREATE POLICY "Users can read company holidays"
  ON bank_holidays FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid()));

-- Admins can manage holidays
CREATE POLICY "Admins can manage holidays"
  ON bank_holidays FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE clerk_id = auth.uid())
    AND (SELECT admin FROM users WHERE clerk_id = auth.uid()) = true
  );
```

### 6.3 API Endpoints

#### Company Endpoints
```typescript
// Get company details
GET /api/company
Response: Company

// Update company settings
PATCH /api/company
Body: Partial<Company>
Response: Company

// Delete company
DELETE /api/company
Body: { confirm_name: string }
Response: { success: boolean }

// Trigger carry-over calculation
POST /api/company/carry-over
Response: { success: boolean, users_processed: number }

// Regenerate API token
POST /api/company/regenerate-token
Response: { token: string }
```

#### Department Endpoints
```typescript
// List all departments
GET /api/departments
Response: Department[]

// Get department details
GET /api/departments/:id
Response: Department & { boss: User, supervisors: User[], users: User[] }

// Create department
POST /api/departments
Body: { name: string, boss_id: string, allowance?: number, include_public_holidays?: boolean, is_accrued_allowance?: boolean }
Response: Department

// Update department
PATCH /api/departments/:id
Body: Partial<Department>
Response: Department

// Delete department
DELETE /api/departments/:id
Response: { success: boolean }

// Add secondary supervisors
POST /api/departments/:id/supervisors
Body: { user_ids: string[] }
Response: { success: boolean }

// Remove secondary supervisor
DELETE /api/departments/:id/supervisors/:user_id
Response: { success: boolean }
```

#### Schedule Endpoints
```typescript
// Get company schedule
GET /api/schedules/company
Response: Schedule

// Update company schedule
PATCH /api/schedules/company
Body: { monday: number, tuesday: number, ..., sunday: number }
Response: Schedule

// Get user schedule
GET /api/schedules/user/:user_id
Response: Schedule

// Update user schedule
PATCH /api/schedules/user/:user_id
Body: { monday: number, tuesday: number, ..., sunday: number }
Response: Schedule

// Delete user schedule (revert to company)
DELETE /api/schedules/user/:user_id
Response: { success: boolean }
```

#### Bank Holiday Endpoints
```typescript
// List all holidays
GET /api/bank-holidays
Query: { year?: number, country?: string }
Response: BankHoliday[]

// Create holiday
POST /api/bank-holidays
Body: { name: string, date: string, country?: string }
Response: BankHoliday

// Update holiday
PATCH /api/bank-holidays/:id
Body: Partial<BankHoliday>
Response: BankHoliday

// Delete holiday
DELETE /api/bank-holidays/:id
Response: { success: boolean }

// Import holidays for country/year
POST /api/bank-holidays/import
Body: { country: string, year: number }
Response: { created: number, holidays: BankHoliday[] }
```

### 6.4 Next.js Implementation

#### Company Settings Page
```typescript
// app/(dashboard)/settings/company/page.tsx
import { CompanySettingsForm } from '@/components/features/company/CompanySettingsForm';
import { getCompany } from '@/lib/supabase/queries/company';

export default async function CompanySettingsPage() {
  const company = await getCompany();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Company Settings</h1>
      <CompanySettingsForm company={company} />
    </div>
  );
}
```

#### Department Management Page
```typescript
// app/(dashboard)/settings/departments/page.tsx
import { DepartmentList } from '@/components/features/departments/DepartmentList';
import { getDepartments } from '@/lib/supabase/queries/departments';

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Departments</h1>
      <DepartmentList departments={departments} />
    </div>
  );
}
```

#### Schedule Settings Page
```typescript
// app/(dashboard)/settings/schedule/page.tsx
import { ScheduleEditor } from '@/components/features/schedule/ScheduleEditor';
import { getCompanySchedule } from '@/lib/supabase/queries/schedule';

export default async function SchedulePage() {
  const schedule = await getCompanySchedule();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Working Schedule</h1>
      <ScheduleEditor schedule={schedule} type="company" />
    </div>
  );
}
```

### 6.5 Component Examples

#### Company Settings Form
```typescript
// components/features/company/CompanySettingsForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export function CompanySettingsForm({ company }) {
  const { register, handleSubmit } = useForm({ defaultValues: company });
  
  const onSubmit = async (data) => {
    // Update company via API
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input label="Company Name" {...register('name')} />
      <Select label="Country" {...register('country')} options={countries} />
      <Select label="Timezone" {...register('timezone')} options={timezones} />
      <Select label="Date Format" {...register('date_format')} options={dateFormats} />
      <Checkbox label="Share all absences" {...register('share_all_absences')} />
      <Checkbox label="Hide team view" {...register('is_team_view_hidden')} />
      <Select label="Carry over" {...register('carry_over')} options={carryOverOptions} />
      <Button type="submit">Save Changes</Button>
    </form>
  );
}
```

#### Department List Component
```typescript
// components/features/departments/DepartmentList.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DepartmentCard } from './DepartmentCard';
import { CreateDepartmentDialog } from './CreateDepartmentDialog';

export function DepartmentList({ departments }) {
  const [showCreate, setShowCreate] = useState(false);
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">All Departments</h2>
        <Button onClick={() => setShowCreate(true)}>Add Department</Button>
      </div>
      
      <div className="grid gap-4">
        {departments.map(dept => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>
      
      {showCreate && (
        <CreateDepartmentDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
```

#### Schedule Editor Component
```typescript
// components/features/schedule/ScheduleEditor.tsx
'use client';

import { useForm } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ScheduleEditor({ schedule, type }) {
  const { register, handleSubmit } = useForm({
    defaultValues: DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: schedule[day] === 1
    }), {})
  });
  
  const onSubmit = async (data) => {
    // Convert boolean to 1/2 and update via API
    const scheduleData = DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: data[day] ? 1 : 2
    }), {});
    
    // Update schedule
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-7 gap-4">
        {DAYS.map(day => (
          <Checkbox
            key={day}
            label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
            {...register(day)}
          />
        ))}
      </div>
      <Button type="submit">Save Schedule</Button>
    </form>
  );
}
```

---

## 7. User Experience

### 7.1 Company Settings Page

**Layout:**
- Header: "Company Settings"
- Tabs: General, Departments, Schedule, Holidays, Integration
- Form sections:
  - Company Information (name, country, timezone)
  - Display Settings (date format)
  - Absence Settings (share all, hide team view)
  - Leave Year Settings (start month, carry over)
  - Company Message
  - Danger Zone (delete company)

**Interactions:**
- Auto-save on field blur (optional)
- Save button at bottom
- Confirmation for destructive actions
- Inline validation errors
- Success toast on save

### 7.2 Department Management Page

**Layout:**
- Header: "Departments"
- "Add Department" button (top right)
- Department cards/list:
  - Department name
  - Boss name
  - User count
  - Allowance
  - Edit/Delete actions

**Department Details Page:**
- Department name (editable)
- Boss selection dropdown
- Allowance configuration
- Public holiday settings
- Accrued allowance toggle
- Secondary supervisors section:
  - List of current supervisors
  - "Add Supervisors" button
  - Remove buttons for each

**Interactions:**
- Click department card to edit
- Inline editing for simple fields
- Modal for supervisor selection
- Confirmation for deletion
- Warning for departments with users

### 7.3 Schedule Settings Page

**Layout:**
- Header: "Working Schedule"
- Tabs: Company Schedule, User Schedules
- Company Schedule:
  - Visual week calendar
  - Checkboxes for each day
  - Save button
- User Schedules:
  - List of users with custom schedules
  - "Add User Schedule" button
  - Edit/Delete actions

**Schedule Editor:**
- Visual representation of week
- Large checkboxes for each day
- Working days highlighted in green
- Non-working days grayed out
- "Use company schedule" option (for users)
- Save/Cancel buttons

**Interactions:**
- Click day to toggle
- Visual feedback on hover
- Confirmation for changes with active users
- Warning if no working days selected

### 7.4 Public Holidays Page

**Layout:**
- Header: "Public Holidays"
- Year selector dropdown
- Country filter (if multi-country)
- "Add Holiday" button
- "Import Holidays" button
- Holiday table:
  - Date
  - Name
  - Country
  - Edit/Delete actions

**Add/Edit Holiday Modal:**
- Holiday name input
- Date picker
- Country dropdown
- Save/Cancel buttons

**Import Holidays Modal:**
- Country dropdown
- Year selector
- Preview of holidays to import
- "Import" button

**Interactions:**
- Click row to edit
- Inline editing (optional)
- Confirmation for deletion
- Success message on import
- Duplicate detection

---

## 8. Implementation Notes

### 8.1 Technical Considerations

**Performance:**
- Company settings cached in memory
- Department list cached with revalidation
- Schedule lookups optimized with indexes
- Holiday queries filtered by year

**Security:**
- All mutations require admin role
- RLS policies enforce company isolation
- API token stored securely
- Deletion requires confirmation

**Data Integrity:**
- Foreign key constraints enforced
- XOR constraint on Schedule table (company_id vs user_id)
- Cascading deletes handled carefully
- Transactions for multi-table operations

**Migration from v1:**
- Company settings mapped directly
- Departments preserve boss assignments
- Schedules converted from v1 format
- Holidays imported with country codes
- LDAP settings excluded (out of scope for v2.0)

### 8.2 Edge Cases

**Company Deletion:**
- Last admin cannot delete company if other users exist
- Must confirm by typing company name
- All data deleted permanently
- User logged out after deletion

**Department Deletion:**
- Cannot delete if users assigned
- Cannot delete last department
- Must move users first
- Supervisor assignments removed

**Schedule Changes:**
- Changing schedule with active users shows warning
- Historical calculations unaffected
- Future allowances recalculated
- At least one working day required

**Holiday Conflicts:**
- Duplicate dates allowed (different countries)
- Editing holiday with leaves shows warning
- Deleting holiday doesn't delete leaves
- Country matching handles null values

### 8.3 Future Enhancements

**Phase 2 Features (Out of Scope for v2.0):**
- LDAP integration for authentication
- Multi-language support
- Custom fields for departments
- Department hierarchy (parent/child)
- Half-day working schedules (morning/afternoon)
- Holiday templates for more countries
- Bulk holiday import from CSV
- Department-specific leave types
- Advanced reporting by department
- Department budgets and cost centers

---

## 9. Testing Requirements

### 9.1 Unit Tests

**Company Model:**
- Create company with defaults
- Update company settings
- Validate country codes
- Validate timezones
- Validate date formats
- Calculate carry-over
- Generate API token
- Delete company

**Department Model:**
- Create department
- Update department
- Assign boss
- Add/remove supervisors
- Validate allowance values
- Delete department
- Prevent deletion with users

**Schedule Model:**
- Create company schedule
- Create user schedule
- Validate XOR constraint
- Validate working days
- Update schedule
- Delete user schedule

**Bank Holiday Model:**
- Create holiday
- Update holiday
- Delete holiday
- Filter by year
- Filter by country
- Generate default holidays

### 9.2 Integration Tests

**Company Workflows:**
- Register new company → creates defaults
- Update company settings → changes reflected
- Delete company → all data removed
- Trigger carry-over → allowances updated

**Department Workflows:**
- Create department → boss assigned
- Add supervisors → permissions granted
- Remove supervisor → permissions revoked
- Delete department → requires empty department

**Schedule Workflows:**
- Edit company schedule → affects all users
- Create user schedule → overrides company
- Delete user schedule → reverts to company
- Validate working days → at least one required

**Holiday Workflows:**
- Create holiday → appears in calendar
- Import holidays → bulk creation
- Edit holiday → calendar updated
- Delete holiday → removed from calendar

### 9.3 End-to-End Tests

**Admin User Journey:**
1. Login as admin
2. Navigate to company settings
3. Update company name and timezone
4. Create new department
5. Assign supervisors to department
6. Configure department allowance
7. Edit company schedule
8. Create user-specific schedule
9. Add public holidays
10. Import holidays for country
11. Verify all changes reflected

**Multi-Department Scenario:**
1. Create 3 departments
2. Assign different bosses
3. Add secondary supervisors
4. Set different allowances
5. Configure accrued allowance for one
6. Verify supervisor permissions
7. Verify allowance calculations

**Schedule Scenario:**
1. Set company schedule (Mon-Fri)
2. Create user with custom schedule (Mon-Wed)
3. Verify allowance calculations differ
4. Change company schedule
5. Verify user schedule unaffected
6. Delete user schedule
7. Verify user reverts to company schedule

---

## 10. Dependencies & References

### 10.1 Related PRDs

- **PRD 00**: Project overview and architecture
- **PRD 01**: User management (boss and supervisor assignments)
- **PRD 04**: Leave workflow (department routing, schedule validation)
- **PRD 06**: Allowance management (department allowance, schedule calculations)
- **PRD 12**: Database schema (table definitions)

### 10.2 External Documentation

- [IANA Timezone Database](https://www.iana.org/time-zones)
- [ISO 3166 Country Codes](https://www.iso.org/iso-3166-country-codes.html)
- [Moment.js Date Formats](https://momentjs.com/docs/#/displaying/format/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

### 10.3 Legacy Code References

- `lib/model/db/company.js` - v1 Company model
- `lib/model/db/department.js` - v1 Department model
- `lib/model/db/schedule.js` - v1 Schedule model
- `lib/model/db/bank_holiday.js` - v1 BankHoliday model
- `lib/route/settings.js` - v1 Company settings routes
- `lib/route/departments.js` - v1 Department management routes

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | PM Team | Initial draft based on v1 analysis |

---

## Approval

This document requires approval from:
- [ ] Executive Sponsor
- [ ] Technical Lead
- [ ] Product Manager
- [ ] Key Stakeholders

---

*End of PRD 02 - Company & Organizational Structure*
