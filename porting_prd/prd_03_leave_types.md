# PRD 03: Leave Type Configuration

**Document Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Draft  
**Author:** Senior Product Manager  
**Related PRDs:** PRD 00 (Overview), PRD 01 (User Management), PRD 02 (Company Structure), PRD 04 (Leave Workflow), PRD 06 (Allowance Management), PRD 12 (Database Schema)

---

## Executive Summary

This PRD defines the comprehensive requirements for leave type configuration and management in TimeOff Management Application v2. Leave types are fundamental building blocks that categorize different kinds of absences (Vacation, Sick Leave, Maternity, etc.) and control how they are tracked, approved, and displayed throughout the application.

### Business Context

Leave type management is critical for:
- Categorizing different types of employee absences
- Controlling whether absences count against annual allowance
- Setting limits on specific leave types (e.g., max 10 sick days)
- Visual differentiation through color coding in calendars
- Automating approval workflows for certain leave types
- Providing flexibility for diverse organizational policies

### Goals and Objectives

1. **Flexible Leave Type Configuration**: Support diverse absence categories and policies
2. **Allowance Control**: Enable types that use or don't use annual allowance
3. **Type-Specific Limits**: Set maximum days per leave type per year
4. **Visual Identification**: Color coding for easy calendar recognition
5. **Auto-Approval**: Support automatic approval for certain leave types
6. **Ordering and Organization**: Customizable display order for leave types
7. **Migration Path**: Enable smooth transition from v1's leave type structure

### Success Criteria

- All v1 leave type properties supported in v2
- Admins can create, edit, and delete leave types
- Leave types integrate correctly with request workflow (PRD 04)
- Leave types integrate correctly with allowance calculations (PRD 06)
- Color coding displays consistently across all calendar views
- Auto-approval functions correctly for designated leave types
- Default leave types created automatically during company registration
- Data migration from v1 preserves all leave type configurations

---

## 1. Leave Type Properties

### 1.1 Core Leave Type Fields

#### FR-LT-001: Leave Type Data Model
**Priority:** Critical  
**Description:** Define the complete data structure for leave types

**Requirements:**
- Leave type properties:
  - `id`: Unique identifier (auto-generated)
  - `name`: Leave type name (required, string, max 100 characters)
  - `companyId`: Company association (required, foreign key)
  - `color`: Color identifier for visual display (required, string)
  - `use_allowance`: Whether type deducts from annual allowance (boolean, default: true)
  - `limit`: Maximum days allowed per year for this type (integer, default: 0)
  - `sort_order`: Display order in dropdowns and lists (integer, default: 0)
  - `auto_approve`: Automatically approve requests of this type (boolean, default: false)
  - `created_at`: Timestamp of creation (auto-generated)
  - `updated_at`: Timestamp of last update (auto-generated)

**Acceptance Criteria:**
- All fields stored correctly in database
- Required fields validated
- Default values applied correctly
- Foreign key constraints enforced

#### FR-LT-002: Leave Type Name
**Priority:** Critical  
**Description:** Name that identifies the leave type

**Requirements:**
- Name field requirements:
  - Required (cannot be empty)
  - String, max 100 characters
  - Unique per company (no duplicate names within same company)
  - Trimmed of leading/trailing whitespace
  - Cannot contain only whitespace
- Common leave type names:
  - Holiday / Vacation
  - Sick Leave
  - Maternity Leave
  - Paternity Leave
  - Bereavement Leave
  - Study Leave
  - Unpaid Leave
  - Work From Home
  - Compassionate Leave
- Name validation:
  - Cannot be empty after trimming
  - Must be unique within company
  - No special validation on characters (allow international characters)
- Name displayed:
  - In leave request forms (dropdown)
  - In calendar views (tooltips, legends)
  - In reports and exports
  - In admin settings

**Acceptance Criteria:**
- Name uniqueness enforced per company
- Validation prevents empty names
- Name displays correctly throughout application
- International characters supported

#### FR-LT-003: Leave Type Color Coding
**Priority:** High  
**Description:** Visual color identification for calendar display

**Requirements:**
- Color system:
  - Predefined color palette (CSS classes)
  - Color classes: `leave_type_color_1` through `leave_type_color_10`
  - Each class maps to specific color (defined in CSS)
  - Hex color codes also supported for custom colors (e.g., `#22AA66`)
- Color storage:
  - Stored as string in `color` field
  - Can be CSS class name (e.g., `leave_type_color_1`)
  - Can be hex code (e.g., `#22AA66`)
  - Default: `leave_type_color_1` (or `#ffffff`)
- Color picker UI:
  - Dropdown showing color swatches
  - 10 predefined colors available
  - Visual preview of selected color
  - Color name/number displayed
- Color application:
  - Calendar cells for approved/pending leaves
  - Leave type legend in calendar views
  - Leave request forms (visual indicator)
  - Reports and exports (where applicable)
- Color class detection:
  - If value starts with `#`, treat as hex code → use `leave_type_color_1` class
  - Otherwise, use value as CSS class name directly
- Color palette (suggested):
  - Color 1: Green (`#22AA66`) - Default for Holiday/Vacation
  - Color 2: Blue (`#459FF3`) - Default for Sick Leave
  - Color 3: Purple
  - Color 4: Orange
  - Color 5: Red
  - Color 6: Yellow
  - Color 7: Pink
  - Color 8: Teal
  - Color 9: Brown
  - Color 10: Gray

**Acceptance Criteria:**
- Color picker displays all available colors
- Selected color applies to calendar displays
- Hex codes and CSS classes both supported
- Color persists correctly
- Color displays consistently across all views

#### FR-LT-004: Use Allowance Flag
**Priority:** Critical  
**Description:** Control whether leave type deducts from annual allowance

**Requirements:**
- `use_allowance` field (boolean):
  - `true`: Leave deducts from employee's annual allowance (default)
  - `false`: Leave does NOT deduct from allowance (separate tracking)
- Behavior when `use_allowance = true`:
  - Leave days deducted from employee's remaining allowance
  - Cannot request more days than available allowance
  - Allowance balance updated when leave approved
  - Allowance restored if leave cancelled/rejected
- Behavior when `use_allowance = false`:
  - Leave days tracked separately
  - Does NOT affect annual allowance balance
  - Can request unlimited days (unless `limit` is set)
  - Useful for: Sick leave, unpaid leave, work-from-home days
- Use cases:
  - `true`: Holiday, Vacation, Personal Days
  - `false`: Sick Leave, Maternity, Bereavement, Unpaid Leave
- Display in UI:
  - Checkbox: "Deduct from allowance"
  - Checked = uses allowance
  - Unchecked = does not use allowance
  - Clear label explaining behavior

**Acceptance Criteria:**
- Flag controls allowance deduction correctly
- Allowance calculations respect flag
- Request validation considers flag
- UI clearly indicates allowance usage

#### FR-LT-005: Leave Type Limit
**Priority:** High  
**Description:** Maximum days allowed per year for this leave type

**Requirements:**
- `limit` field (integer):
  - `0`: No limit (default) - unlimited requests of this type
  - `1-365`: Specific maximum days per year
  - Applies per leave year (respects company's leave year start)
- Limit enforcement:
  - Tracks total days used for this leave type in current leave year
  - Prevents requests that would exceed limit
  - Validation error shown if limit exceeded
  - Limit applies regardless of `use_allowance` setting
- Limit calculation:
  - Sum of all approved leave days for this type in current year
  - Includes pending requests (to prevent over-requesting)
  - Resets at leave year boundary
- Use cases:
  - Sick leave: 10 days per year
  - Work from home: 52 days per year (1 per week)
  - Study leave: 5 days per year
  - Unpaid leave: 30 days per year
- Limit display:
  - Input field for number of days
  - "0" or empty = unlimited
  - Validation: must be 0-365
  - Help text explaining behavior
- Limit checking:
  - When employee submits request, check if limit would be exceeded
  - Show error: "This request would exceed the annual limit of X days for [Leave Type]"
  - Show current usage: "You have used Y of X days for [Leave Type] this year"

**Acceptance Criteria:**
- Limit enforced during request submission
- Limit resets at leave year boundary
- Limit applies to both allowance and non-allowance types
- Clear error messages when limit exceeded
- Current usage displayed to users

#### FR-LT-006: Sort Order
**Priority:** Medium  
**Description:** Control display order of leave types in dropdowns and lists

**Requirements:**
- `sort_order` field (integer):
  - Default: 0
  - Lower numbers appear first
  - Same number: alphabetical by name
  - Range: 0-999
- Sort order affects:
  - Leave type dropdown in request forms
  - Leave type list in admin settings
  - Leave type legend in calendar views
  - Reports and exports
- Sort order management:
  - Admin can set sort order for each leave type
  - "Move to top" button sets sort_order to 1, others to 0
  - Manual input field for specific order
  - Drag-and-drop reordering (future enhancement)
- Default sorting:
  - New leave types get sort_order = 0
  - Alphabetical within same sort_order
- Use cases:
  - Put most common leave type (Holiday) first
  - Group related types together
  - Separate allowance vs. non-allowance types

**Acceptance Criteria:**
- Sort order controls display sequence
- Lower numbers appear first
- Alphabetical fallback works
- Admin can update sort order
- Sorting consistent across application

#### FR-LT-007: Auto-Approve Flag
**Priority:** Medium  
**Description:** Automatically approve requests for certain leave types

**Requirements:**
- `auto_approve` field (boolean):
  - `true`: Requests of this type automatically approved
  - `false`: Requests require supervisor approval (default)
- Auto-approve behavior:
  - When employee submits request with auto-approve type:
    - Request immediately marked as "Approved"
    - Status set to "approved"
    - No supervisor action required
    - Approval notification sent to employee
    - Allowance deducted immediately (if applicable)
  - Supervisor still sees request in history
  - Supervisor can revoke auto-approved requests
- Use cases:
  - Work From Home days (trust-based)
  - Unpaid leave (no approval needed)
  - Certain companies with flexible policies
  - Types that don't require oversight
- Auto-approve + use_allowance combinations:
  - `auto_approve=true, use_allowance=true`: Auto-approved, deducts allowance
  - `auto_approve=true, use_allowance=false`: Auto-approved, no allowance impact
  - `auto_approve=false, use_allowance=true`: Requires approval, deducts allowance
  - `auto_approve=false, use_allowance=false`: Requires approval, no allowance impact
- Auto-approve + limit:
  - Limit still enforced even with auto-approve
  - Cannot auto-approve if limit exceeded
- Display in UI:
  - Checkbox: "Auto-approve requests"
  - Warning: "Requests of this type will be automatically approved"
  - Clear indication in request form if type is auto-approved

**Acceptance Criteria:**
- Auto-approve flag bypasses approval workflow
- Requests immediately marked as approved
- Allowance deducted correctly
- Limits still enforced
- Notifications sent appropriately
- UI indicates auto-approve status

---

## 2. Leave Type Management

### 2.1 Create Leave Types

#### FR-LT-008: Default Leave Types
**Priority:** Critical  
**Description:** Automatically create default leave types during company registration

**Requirements:**
- Default leave types created when company is registered:
  1. **Holiday** (or "Vacation" for US companies)
     - `name`: "Holiday"
     - `color`: `#22AA66` (green) or `leave_type_color_1`
     - `use_allowance`: true
     - `limit`: 0 (unlimited)
     - `sort_order`: 0
     - `auto_approve`: false
  2. **Sick Leave**
     - `name`: "Sick Leave"
     - `color`: `#459FF3` (blue) or `leave_type_color_2`
     - `use_allowance`: false
     - `limit`: 10 (suggested, configurable)
     - `sort_order`: 0
     - `auto_approve`: false
- Default types created atomically with company
- Transaction-based creation (all-or-nothing)
- Default types can be edited or deleted by admin
- Default types localized based on company country (future enhancement)

**Acceptance Criteria:**
- Two default leave types created with company
- Default properties set correctly
- Types immediately available for use
- Admin can modify defaults

#### FR-LT-009: Create New Leave Type
**Priority:** Critical  
**Description:** Administrators can create custom leave types

**Requirements:**
- Admin-only function
- Create new leave type form:
  - Name (required, text input)
  - Color (required, color picker dropdown)
  - Use allowance (checkbox, default: checked)
  - Limit (number input, default: 0)
  - Auto-approve (checkbox, default: unchecked)
  - Sort order (number input, default: 0)
- Validation:
  - Name required and unique per company
  - Color required
  - Limit must be 0-365
  - Sort order must be 0-999
- Creation process:
  - Admin fills form
  - Validation on submit
  - Leave type created in database
  - Success message displayed
  - Redirect to settings page
  - New type immediately available in dropdowns
- Audit trail:
  - Log leave type creation
  - Record admin user who created it
  - Timestamp of creation

**Acceptance Criteria:**
- Admin can create new leave types
- Validation prevents invalid data
- New types immediately available
- Creation logged in audit trail

### 2.2 Edit Leave Types

#### FR-LT-010: Edit Existing Leave Type
**Priority:** High  
**Description:** Administrators can modify leave type properties

**Requirements:**
- Admin-only function
- Edit leave type form:
  - All fields editable (name, color, use_allowance, limit, auto_approve, sort_order)
  - Pre-populated with current values
  - Same validation as create
- Editing restrictions:
  - Cannot change `companyId` (leave type belongs to company)
  - Cannot change `id` (immutable)
- Editing considerations:
  - Changing `use_allowance`:
    - Affects future requests only
    - Does not retroactively change existing requests
    - Warning shown if existing requests exist
  - Changing `limit`:
    - Affects current year immediately
    - May invalidate pending requests (show warning)
    - Does not affect approved historical requests
  - Changing `auto_approve`:
    - Affects future requests only
    - Does not change existing pending requests
  - Changing `name`:
    - Updates all displays immediately
    - Historical requests show new name
  - Changing `color`:
    - Updates calendar displays immediately
    - Historical requests show new color
- Bulk edit:
  - Admin can edit multiple leave types on same page
  - Each leave type has its own form section
  - Single "Save All" button
  - All updates saved atomically
- Audit trail:
  - Log all changes to leave types
  - Record old and new values
  - Record admin user who made changes
  - Timestamp of changes

**Acceptance Criteria:**
- Admin can edit all leave type fields
- Changes apply correctly to future requests
- Warnings shown for impactful changes
- Bulk edit saves all changes atomically
- Changes logged in audit trail

### 2.3 Delete Leave Types

#### FR-LT-011: Delete Leave Type
**Priority:** Medium  
**Description:** Administrators can remove unused leave types

**Requirements:**
- Admin-only function
- Deletion restrictions:
  - Cannot delete if leave type has any associated leave requests (approved, pending, or rejected)
  - Cannot delete last leave type in company (must have at least one)
  - Cannot delete default types if they are in use
- Deletion validation:
  - Check for associated leave requests
  - Count of requests shown in error message
  - Error: "Cannot delete leave type: X requests exist for this type"
- Deletion process:
  - Admin clicks "Delete" button next to leave type
  - Confirmation dialog:
    - "Are you sure you want to delete [Leave Type Name]?"
    - "This action cannot be undone"
    - Type name to confirm (for extra safety)
  - On confirm:
    - Validation checks performed
    - Leave type deleted from database
    - Success message displayed
    - Redirect to settings page
- Cascading deletion:
  - No cascading needed (deletion blocked if requests exist)
  - Leave type simply removed from database
- Audit trail:
  - Log leave type deletion
  - Record leave type details before deletion
  - Record admin user who deleted it
  - Timestamp of deletion

**Acceptance Criteria:**
- Unused leave types can be deleted
- Leave types with requests cannot be deleted
- Last leave type cannot be deleted
- Confirmation prevents accidental deletion
- Deletion logged in audit trail

### 2.4 Leave Type Display

#### FR-LT-012: Leave Type List (Admin View)
**Priority:** High  
**Description:** Display all company leave types in admin settings

**Requirements:**
- Admin settings page shows all leave types
- Display format:
  - Table or card layout
  - One row/card per leave type
  - Sorted by `sort_order`, then alphabetically
- Columns/fields displayed:
  - Name (editable inline or via form)
  - Color (visual swatch + picker)
  - Use allowance (checkbox)
  - Limit (number, "0" or "Unlimited")
  - Auto-approve (checkbox)
  - Sort order (number)
  - Actions (Edit, Delete buttons)
- Inline editing (optional):
  - Click field to edit
  - Save button per row
  - Cancel button to revert
- Bulk editing:
  - Edit multiple types at once
  - Single "Save All Changes" button
  - Validation on save
- Add new leave type:
  - "Add New Leave Type" button at top/bottom
  - Expands form for new type
  - Inline creation or modal dialog
- Visual indicators:
  - Color swatch showing actual color
  - Icons for use_allowance, auto_approve
  - Badge showing limit (if set)
- Responsive design:
  - Mobile-friendly layout
  - Collapsible sections on small screens

**Acceptance Criteria:**
- All leave types displayed
- Sorting correct
- Inline or form editing works
- Visual indicators clear
- Mobile responsive

#### FR-LT-013: Leave Type Dropdown (Request Form)
**Priority:** Critical  
**Description:** Display leave types in request submission form

**Requirements:**
- Leave type selector in request form:
  - Dropdown/select element
  - Shows all active leave types for company
  - Sorted by `sort_order`, then alphabetically
  - Required field (must select a type)
- Dropdown options:
  - Display leave type name
  - Optional: color indicator (colored dot/square)
  - Optional: icon for auto-approve types
  - Optional: "(uses allowance)" or "(separate)" indicator
- Selected type behavior:
  - On selection, form updates:
    - Show/hide allowance impact message
    - Show limit remaining (if applicable)
    - Show auto-approve notice (if applicable)
  - Color preview shown
- Filtering (future enhancement):
  - Filter by allowance vs. non-allowance
  - Search/filter by name
- Accessibility:
  - Keyboard navigation
  - Screen reader support
  - Clear labels

**Acceptance Criteria:**
- All leave types available in dropdown
- Sorting correct
- Selection updates form appropriately
- Accessibility requirements met

#### FR-LT-014: Leave Type Legend (Calendar View)
**Priority:** High  
**Description:** Display leave type color legend in calendar views

**Requirements:**
- Calendar views include leave type legend:
  - Shows all leave types used in current view
  - Color swatch + leave type name
  - Positioned at top or side of calendar
- Legend display:
  - Only show types that have leaves in current view (optional)
  - Or show all company leave types (always visible)
  - Color swatch matches calendar cell colors
  - Name matches leave type name
- Legend interactivity (optional):
  - Click to filter calendar by leave type
  - Hover to highlight leaves of that type
  - Toggle visibility of specific types
- Legend layout:
  - Horizontal row of color swatches
  - Vertical list with labels
  - Responsive design
- Legend updates:
  - Updates when calendar date range changes
  - Updates when leave types are edited

**Acceptance Criteria:**
- Legend displays all relevant leave types
- Colors match calendar cells
- Legend visible in all calendar views
- Updates dynamically

---

## 3. Leave Type Integration

### 3.1 Integration with Leave Requests (PRD 04)

#### FR-LT-015: Leave Type Selection in Requests
**Priority:** Critical  
**Description:** Leave type must be selected when creating leave request

**Requirements:**
- Leave request form requires leave type selection
- Leave type determines:
  - Whether request uses allowance
  - Whether request is auto-approved
  - Color displayed in calendar
  - Limit checking
- Leave type validation:
  - Must select valid leave type from company
  - Cannot submit request without leave type
  - Leave type must be active (not deleted)
- Leave type stored with request:
  - `leaveTypeId` foreign key on Leave table
  - Relationship: Leave belongs to LeaveType
  - Leave type name/color cached or fetched on display

**Acceptance Criteria:**
- Leave type required for all requests
- Leave type determines request behavior
- Leave type relationship maintained
- Leave type properties applied correctly

#### FR-LT-016: Allowance Deduction Based on Leave Type
**Priority:** Critical  
**Description:** Leave type `use_allowance` flag controls allowance deduction

**Requirements:**
- When leave request approved:
  - If `use_allowance = true`: Deduct days from employee allowance
  - If `use_allowance = false`: Do NOT deduct from allowance
- Allowance calculation:
  - Only count days for leave types with `use_allowance = true`
  - Separate tracking for non-allowance types
  - Allowance balance reflects only allowance-using types
- Request validation:
  - If `use_allowance = true`: Check if sufficient allowance available
  - If `use_allowance = false`: Skip allowance check (but still check limit)
- Allowance display:
  - Show allowance balance (only allowance-using types)
  - Show separate usage for non-allowance types
  - Reports distinguish between allowance and non-allowance absences

**Acceptance Criteria:**
- Allowance deduction respects `use_allowance` flag
- Validation checks allowance only for allowance-using types
- Allowance balance accurate
- Reports distinguish type categories

#### FR-LT-017: Leave Type Limit Enforcement
**Priority:** High  
**Description:** Enforce leave type limits during request submission

**Requirements:**
- Limit checking when request submitted:
  - Calculate total days used for this leave type in current leave year
  - Include approved requests
  - Include pending requests (to prevent over-requesting)
  - Compare against leave type `limit`
  - If limit exceeded, reject request with error
- Limit calculation:
  - Sum of all leave days for this type in current year
  - Respects leave year boundaries (company `start_of_new_year`)
  - Resets at leave year start
- Error message:
  - "This request would exceed the annual limit of X days for [Leave Type]"
  - "You have used Y of X days for [Leave Type] this year"
  - "This request is for Z days, which would exceed the limit by W days"
- Limit display:
  - Show limit and usage in request form
  - Show remaining days available
  - Update dynamically as dates selected
- Limit bypass (admin):
  - Admin can override limit (with confirmation)
  - Override logged in audit trail
  - Use case: exceptional circumstances

**Acceptance Criteria:**
- Limit enforced during request submission
- Limit calculation accurate
- Error messages clear and helpful
- Limit resets at leave year boundary
- Admin override works

#### FR-LT-018: Auto-Approve Workflow
**Priority:** Medium  
**Description:** Automatically approve requests for auto-approve leave types

**Requirements:**
- When request submitted with `auto_approve = true` leave type:
  - Request immediately set to "approved" status
  - No supervisor approval required
  - Approval timestamp set to submission time
  - Approved by "System" or "Auto-Approved"
  - Employee notified of approval
  - Allowance deducted immediately (if applicable)
- Auto-approve bypass:
  - Still enforce limit (cannot auto-approve if limit exceeded)
  - Still validate dates (no overlaps, valid date range)
  - Still check working days (if applicable)
- Supervisor visibility:
  - Supervisor can still see auto-approved requests
  - Supervisor can revoke auto-approved requests
  - Supervisor notified of auto-approved requests (optional)
- Request history:
  - Auto-approved requests shown in history
  - Clearly marked as "Auto-Approved"
  - Audit trail shows auto-approval

**Acceptance Criteria:**
- Auto-approve flag bypasses approval workflow
- Requests immediately approved
- Validation still performed
- Supervisor can revoke
- Audit trail maintained

### 3.2 Integration with Calendar Views (PRD 05)

#### FR-LT-019: Color Coding in Calendar
**Priority:** High  
**Description:** Display leave requests with leave type colors in calendar

**Requirements:**
- Calendar cells display leave type color:
  - Approved leaves: Full color (from leave type)
  - Pending leaves: Lighter shade or pattern
  - Rejected leaves: Grayed out or strikethrough
- Color application:
  - Use `color` field from leave type
  - If hex code: convert to CSS background color
  - If CSS class: apply class to calendar cell
- Color consistency:
  - Same color across all calendar views (month, team, wall chart)
  - Same color in legend
  - Same color in tooltips/popovers
- Multiple leaves on same day:
  - Show multiple colors (split cell, stripes, or stacked)
  - Tooltip shows all leaves with colors
- Color accessibility:
  - Ensure sufficient contrast
  - Provide text labels in addition to colors
  - Support colorblind-friendly mode (future enhancement)

**Acceptance Criteria:**
- Leave type colors display in calendar
- Colors consistent across views
- Multiple leaves handled gracefully
- Accessibility considerations met

### 3.3 Integration with Allowance Management (PRD 06)

#### FR-LT-020: Allowance Calculation by Leave Type
**Priority:** Critical  
**Description:** Calculate allowance usage separately for allowance vs. non-allowance types

**Requirements:**
- Allowance balance calculation:
  - Sum only leave types with `use_allowance = true`
  - Exclude leave types with `use_allowance = false`
  - Display separate totals
- Allowance display:
  - "Annual Allowance": Days available for allowance-using types
  - "Used Allowance": Days used for allowance-using types
  - "Remaining Allowance": Annual - Used
  - Separate section for non-allowance types:
    - "Sick Leave Used": X days (if limit set, show "X of Y")
    - "Other Leave Used": Z days
- Reports:
  - Allowance reports show only allowance-using types
  - Separate reports for non-allowance types
  - Breakdown by leave type
- Pro-rated allowance:
  - Applies only to allowance-using types
  - Non-allowance types not pro-rated

**Acceptance Criteria:**
- Allowance calculation excludes non-allowance types
- Separate tracking for each category
- Reports accurate
- Pro-rating correct

---

## 4. User Stories

### 4.1 Leave Type Management

**US-001: Admin Creates Leave Type**
```
As an administrator
I want to create custom leave types
So that I can track different categories of absences

Acceptance Criteria:
- I can access the leave type settings page
- I can click "Add New Leave Type"
- I can enter name, color, and properties
- I can save the new leave type
- The new type appears in request forms immediately
```

**US-002: Admin Edits Leave Type**
```
As an administrator
I want to edit existing leave types
So that I can update policies and settings

Acceptance Criteria:
- I can access the leave type settings page
- I can click "Edit" on any leave type
- I can modify name, color, and properties
- I can save changes
- Changes apply to future requests
- I see warnings for impactful changes
```

**US-003: Admin Deletes Unused Leave Type**
```
As an administrator
I want to delete leave types that are no longer needed
So that I can keep the system clean and organized

Acceptance Criteria:
- I can click "Delete" on unused leave types
- I see a confirmation dialog
- I cannot delete types with existing requests
- I see an error if deletion is blocked
- Successful deletion removes the type
```

### 4.2 Leave Type Usage

**US-004: Employee Selects Leave Type**
```
As an employee
I want to select the appropriate leave type when requesting time off
So that my absence is categorized correctly

Acceptance Criteria:
- I see a dropdown of available leave types
- I can select the type that matches my absence
- I see information about the selected type (allowance usage, auto-approve)
- I see how many days I have remaining for limited types
```

**US-005: Employee Sees Leave Type Colors**
```
As an employee
I want to see different colors for different leave types in the calendar
So that I can quickly identify absence categories

Acceptance Criteria:
- Each leave type has a distinct color
- Colors display in calendar cells
- I see a legend explaining the colors
- Colors are consistent across all views
```

**US-006: Auto-Approved Leave Request**
```
As an employee
I want certain leave types to be automatically approved
So that I don't have to wait for supervisor approval for routine absences

Acceptance Criteria:
- I select an auto-approve leave type
- I see a notice that the request will be auto-approved
- I submit the request
- The request is immediately approved
- I receive an approval notification
```

### 4.3 Leave Type Limits

**US-007: Employee Checks Leave Type Limit**
```
As an employee
I want to see how many days I have used for limited leave types
So that I know how many days I have remaining

Acceptance Criteria:
- I can see limits for each leave type
- I can see how many days I've used
- I can see how many days remain
- I see an error if I try to exceed the limit
```

**US-008: Admin Sets Leave Type Limit**
```
As an administrator
I want to set limits on certain leave types
So that I can enforce company policies

Acceptance Criteria:
- I can set a limit (in days) for any leave type
- I can set "0" for unlimited
- The limit is enforced during request submission
- Employees see clear error messages when limit exceeded
```

---

## 5. Technical Specifications

### 5.1 Database Schema

#### Leave Type Table
```sql
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT 'leave_type_color_1',
  use_allowance BOOLEAN NOT NULL DEFAULT true,
  limit INTEGER NOT NULL DEFAULT 0 CHECK (limit >= 0 AND limit <= 365),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order <= 999),
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_leave_type_name_per_company UNIQUE (company_id, name),
  CONSTRAINT valid_limit CHECK (limit >= 0 AND limit <= 365),
  CONSTRAINT valid_sort_order CHECK (sort_order >= 0 AND sort_order <= 999)
);

CREATE INDEX idx_leave_types_company_id ON leave_types(company_id);
CREATE INDEX idx_leave_types_sort_order ON leave_types(company_id, sort_order, name);
```

#### Relationships
- `leave_types.company_id` → `companies.id` (many-to-one)
- `leaves.leave_type_id` → `leave_types.id` (many-to-one)

### 5.2 TypeScript Types

```typescript
// types/leave-type.ts

export interface LeaveType {
  id: string;
  companyId: string;
  name: string;
  color: string;
  useAllowance: boolean;
  limit: number;
  sortOrder: number;
  autoApprove: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveTypeInput {
  name: string;
  color: string;
  useAllowance?: boolean;
  limit?: number;
  sortOrder?: number;
  autoApprove?: boolean;
}

export interface UpdateLeaveTypeInput {
  name?: string;
  color?: string;
  useAllowance?: boolean;
  limit?: number;
  sortOrder?: number;
  autoApprove?: boolean;
}

export interface LeaveTypeUsage {
  leaveTypeId: string;
  leaveTypeName: string;
  daysUsed: number;
  limit: number;
  daysRemaining: number;
}

export const LEAVE_TYPE_COLORS = [
  { class: 'leave_type_color_1', hex: '#22AA66', name: 'Green' },
  { class: 'leave_type_color_2', hex: '#459FF3', name: 'Blue' },
  { class: 'leave_type_color_3', hex: '#9B59B6', name: 'Purple' },
  { class: 'leave_type_color_4', hex: '#E67E22', name: 'Orange' },
  { class: 'leave_type_color_5', hex: '#E74C3C', name: 'Red' },
  { class: 'leave_type_color_6', hex: '#F1C40F', name: 'Yellow' },
  { class: 'leave_type_color_7', hex: '#EC87C0', name: 'Pink' },
  { class: 'leave_type_color_8', hex: '#1ABC9C', name: 'Teal' },
  { class: 'leave_type_color_9', hex: '#8B4513', name: 'Brown' },
  { class: 'leave_type_color_10', hex: '#95A5A6', name: 'Gray' },
] as const;
```

### 5.3 API Endpoints

#### Get All Leave Types
```typescript
// GET /api/leave-types
// Returns all leave types for current user's company

interface GetLeaveTypesResponse {
  leaveTypes: LeaveType[];
}

// Query params:
// - sortBy: 'sort_order' | 'name' (default: 'sort_order')
// - includeUsage: boolean (include usage stats, default: false)
```

#### Get Single Leave Type
```typescript
// GET /api/leave-types/:id
// Returns specific leave type

interface GetLeaveTypeResponse {
  leaveType: LeaveType;
  usage?: LeaveTypeUsage; // if includeUsage=true
}
```

#### Create Leave Type
```typescript
// POST /api/leave-types
// Admin only

interface CreateLeaveTypeRequest {
  name: string;
  color: string;
  useAllowance?: boolean;
  limit?: number;
  sortOrder?: number;
  autoApprove?: boolean;
}

interface CreateLeaveTypeResponse {
  leaveType: LeaveType;
  message: string;
}

// Validation:
// - name: required, max 100 chars, unique per company
// - color: required, valid color class or hex
// - limit: 0-365
// - sortOrder: 0-999
```

#### Update Leave Type
```typescript
// PATCH /api/leave-types/:id
// Admin only

interface UpdateLeaveTypeRequest {
  name?: string;
  color?: string;
  useAllowance?: boolean;
  limit?: number;
  sortOrder?: number;
  autoApprove?: boolean;
}

interface UpdateLeaveTypeResponse {
  leaveType: LeaveType;
  message: string;
  warnings?: string[]; // e.g., "Changing use_allowance affects future requests"
}
```

#### Delete Leave Type
```typescript
// DELETE /api/leave-types/:id
// Admin only

interface DeleteLeaveTypeResponse {
  message: string;
}

// Error responses:
// - 400: Leave type has associated requests
// - 400: Cannot delete last leave type
// - 404: Leave type not found
```

#### Get Leave Type Usage
```typescript
// GET /api/leave-types/:id/usage
// Returns usage statistics for leave type

interface LeaveTypeUsageResponse {
  leaveTypeId: string;
  leaveTypeName: string;
  currentYear: {
    daysUsed: number;
    daysApproved: number;
    daysPending: number;
    daysRejected: number;
  };
  limit: number;
  daysRemaining: number;
  requests: {
    id: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
  }[];
}
```

### 5.4 Supabase Row Level Security (RLS)

```sql
-- Leave Types RLS Policies

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view leave types from their company
CREATE POLICY "Users can view own company leave types"
  ON leave_types
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE clerk_user_id = auth.uid()
    )
  );

-- Policy: Admins can insert leave types for their company
CREATE POLICY "Admins can create leave types"
  ON leave_types
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE clerk_user_id = auth.uid() AND admin = true
    )
  );

-- Policy: Admins can update leave types in their company
CREATE POLICY "Admins can update leave types"
  ON leave_types
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE clerk_user_id = auth.uid() AND admin = true
    )
  );

-- Policy: Admins can delete leave types in their company
CREATE POLICY "Admins can delete leave types"
  ON leave_types
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE clerk_user_id = auth.uid() AND admin = true
    )
  );
```

### 5.5 Validation Rules

```typescript
// lib/validation/leave-type.ts

import { z } from 'zod';

export const leaveTypeNameSchema = z
  .string()
  .trim()
  .min(1, 'Leave type name is required')
  .max(100, 'Leave type name must be 100 characters or less');

export const leaveTypeColorSchema = z
  .string()
  .refine(
    (val) => 
      /^leave_type_color_\d+$/.test(val) || /^#[0-9A-Fa-f]{6}$/.test(val),
    'Color must be a valid color class or hex code'
  );

export const leaveTypeLimitSchema = z
  .number()
  .int()
  .min(0, 'Limit must be 0 or greater')
  .max(365, 'Limit cannot exceed 365 days');

export const leaveTypeSortOrderSchema = z
  .number()
  .int()
  .min(0, 'Sort order must be 0 or greater')
  .max(999, 'Sort order cannot exceed 999');

export const createLeaveTypeSchema = z.object({
  name: leaveTypeNameSchema,
  color: leaveTypeColorSchema,
  useAllowance: z.boolean().default(true),
  limit: leaveTypeLimitSchema.default(0),
  sortOrder: leaveTypeSortOrderSchema.default(0),
  autoApprove: z.boolean().default(false),
});

export const updateLeaveTypeSchema = z.object({
  name: leaveTypeNameSchema.optional(),
  color: leaveTypeColorSchema.optional(),
  useAllowance: z.boolean().optional(),
  limit: leaveTypeLimitSchema.optional(),
  sortOrder: leaveTypeSortOrderSchema.optional(),
  autoApprove: z.boolean().optional(),
});
```

### 5.6 Business Logic Functions

```typescript
// lib/leave-types/usage.ts

/**
 * Calculate leave type usage for a user in current leave year
 */
export async function calculateLeaveTypeUsage(
  userId: string,
  leaveTypeId: string,
  leaveYear: { start: Date; end: Date }
): Promise<LeaveTypeUsage> {
  // Query all leaves for this user, leave type, and year
  const leaves = await supabase
    .from('leaves')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId)
    .gte('start_date', leaveYear.start.toISOString())
    .lte('end_date', leaveYear.end.toISOString());

  // Sum days by status
  const daysUsed = leaves.data
    ?.filter(l => l.status === 'approved')
    .reduce((sum, l) => sum + l.days, 0) || 0;

  const daysPending = leaves.data
    ?.filter(l => l.status === 'pending')
    .reduce((sum, l) => sum + l.days, 0) || 0;

  // Get leave type to check limit
  const { data: leaveType } = await supabase
    .from('leave_types')
    .select('*')
    .eq('id', leaveTypeId)
    .single();

  const limit = leaveType?.limit || 0;
  const daysRemaining = limit > 0 ? limit - daysUsed - daysPending : Infinity;

  return {
    leaveTypeId,
    leaveTypeName: leaveType?.name || '',
    daysUsed,
    limit,
    daysRemaining,
  };
}

/**
 * Check if leave request would exceed leave type limit
 */
export async function checkLeaveTypeLimit(
  userId: string,
  leaveTypeId: string,
  requestDays: number,
  leaveYear: { start: Date; end: Date }
): Promise<{ allowed: boolean; message?: string }> {
  const usage = await calculateLeaveTypeUsage(userId, leaveTypeId, leaveYear);

  if (usage.limit === 0) {
    // No limit
    return { allowed: true };
  }

  const totalAfterRequest = usage.daysUsed + requestDays;

  if (totalAfterRequest > usage.limit) {
    return {
      allowed: false,
      message: `This request would exceed the annual limit of ${usage.limit} days for ${usage.leaveTypeName}. You have used ${usage.daysUsed} days and this request is for ${requestDays} days.`,
    };
  }

  return { allowed: true };
}

/**
 * Get color class from leave type color field
 */
export function getLeaveTypeColorClass(color: string): string {
  // If hex code, use default class
  if (color.startsWith('#')) {
    return 'leave_type_color_1';
  }
  // Otherwise, use color as class name
  return color;
}

/**
 * Get hex color from leave type color field
 */
export function getLeaveTypeColorHex(color: string): string {
  // If already hex, return as-is
  if (color.startsWith('#')) {
    return color;
  }
  // Otherwise, look up in color palette
  const colorDef = LEAVE_TYPE_COLORS.find(c => c.class === color);
  return colorDef?.hex || '#ffffff';
}
```

---

## 6. User Interface Specifications

### 6.1 Leave Type Settings Page (Admin)

**Layout:**
- Page title: "Leave Types"
- Description: "Configure leave types for your company"
- Table of existing leave types
- "Add New Leave Type" button

**Leave Type Table:**
- Columns:
  - Color (swatch)
  - Name
  - Uses Allowance (icon/badge)
  - Limit (number or "Unlimited")
  - Auto-Approve (icon/badge)
  - Sort Order
  - Actions (Edit, Delete)
- Sortable by sort_order (default)
- Inline editing or modal forms

**Add/Edit Leave Type Form:**
- Name: Text input
- Color: Dropdown with color swatches
- Use Allowance: Checkbox with label
- Limit: Number input (0 = unlimited)
- Auto-Approve: Checkbox with warning
- Sort Order: Number input
- Save/Cancel buttons

**Delete Confirmation:**
- Modal dialog
- Warning message
- Type name to confirm
- Delete/Cancel buttons

### 6.2 Leave Type Selector (Request Form)

**Layout:**
- Label: "Leave Type"
- Dropdown/select element
- Help text below

**Dropdown Options:**
- Each option shows:
  - Color swatch (small circle/square)
  - Leave type name
  - Optional badge: "Auto-Approve" or "Uses Allowance"
- Sorted by sort_order, then name

**On Selection:**
- Show info panel:
  - "This leave type uses your annual allowance" (if applicable)
  - "This leave type will be automatically approved" (if applicable)
  - "You have X of Y days remaining for this type" (if limit)
- Update color preview

### 6.3 Leave Type Legend (Calendar)

**Layout:**
- Horizontal row or vertical list
- Positioned at top or side of calendar

**Legend Items:**
- Color swatch (larger than dropdown)
- Leave type name
- Optional: count of leaves in current view

**Interactivity (optional):**
- Click to filter calendar
- Hover to highlight
- Toggle visibility

---

## 7. Testing Requirements

### 7.1 Unit Tests

**Leave Type Model:**
- Test default values
- Test validation rules
- Test unique name per company
- Test color format validation
- Test limit range validation

**Leave Type Business Logic:**
- Test usage calculation
- Test limit checking
- Test auto-approve logic
- Test color class/hex conversion

### 7.2 Integration Tests

**Leave Type CRUD:**
- Test create leave type
- Test update leave type
- Test delete leave type (success and blocked)
- Test bulk update

**Leave Type in Requests:**
- Test request with allowance type
- Test request with non-allowance type
- Test request with limited type
- Test request with auto-approve type
- Test limit enforcement

**Leave Type in Calendar:**
- Test color display
- Test legend display
- Test multiple types on same day

### 7.3 End-to-End Tests

**Admin Workflow:**
1. Login as admin
2. Navigate to settings
3. Create new leave type
4. Edit leave type properties
5. Delete unused leave type
6. Verify changes in request form

**Employee Workflow:**
1. Login as employee
2. Create leave request
3. Select leave type
4. Verify allowance impact
5. Verify auto-approve (if applicable)
6. Verify limit checking

**Calendar Workflow:**
1. View calendar
2. Verify leave type colors
3. Verify legend
4. Filter by leave type (if implemented)

### 7.4 Edge Cases

- Create leave type with same name (should fail)
- Delete leave type with existing requests (should fail)
- Delete last leave type (should fail)
- Request exceeding leave type limit (should fail)
- Auto-approve with limit exceeded (should fail)
- Change leave type properties with existing requests (should warn)
- Leave type with 0 limit (unlimited)
- Leave type with max limit (365)

---

## 8. Migration from v1

### 8.1 Data Migration

**Leave Type Migration:**
- Extract all leave types from v1 database
- Map v1 fields to v2 schema:
  - `id` → `id` (generate new UUID)
  - `name` → `name`
  - `companyId` → `company_id`
  - `color` → `color` (convert if needed)
  - `use_allowance` → `use_allowance`
  - `limit` → `limit`
  - `sort_order` → `sort_order`
  - `auto_approve` → `auto_approve`
- Validate all data before import
- Create leave types in v2 database
- Map old IDs to new IDs for leave request migration

**Migration Script:**
```typescript
// scripts/migrate-leave-types.ts

async function migrateLeaveTypes(v1CompanyId: string, v2CompanyId: string) {
  // Fetch v1 leave types
  const v1LeaveTypes = await fetchV1LeaveTypes(v1CompanyId);

  // Map to v2 format
  const v2LeaveTypes = v1LeaveTypes.map(v1Type => ({
    company_id: v2CompanyId,
    name: v1Type.name,
    color: v1Type.color || 'leave_type_color_1',
    use_allowance: v1Type.use_allowance ?? true,
    limit: v1Type.limit ?? 0,
    sort_order: v1Type.sort_order ?? 0,
    auto_approve: v1Type.auto_approve ?? false,
  }));

  // Insert into v2 database
  const { data, error } = await supabase
    .from('leave_types')
    .insert(v2LeaveTypes)
    .select();

  if (error) throw error;

  // Create ID mapping for leave migration
  const idMapping = new Map();
  v1LeaveTypes.forEach((v1Type, index) => {
    idMapping.set(v1Type.id, data[index].id);
  });

  return idMapping;
}
```

### 8.2 Migration Validation

**Validation Checks:**
- All v1 leave types migrated
- No duplicate names per company
- All properties mapped correctly
- Color values valid
- Limits within range
- Sort order preserved

**Post-Migration Testing:**
- Verify leave types display in admin settings
- Verify leave types available in request form
- Verify colors display in calendar
- Verify limits enforced
- Verify auto-approve works

---

## 9. Dependencies & References

### 9.1 Dependencies

**Depends On:**
- PRD 01: User Management (admin access required)
- PRD 12: Database Schema (leave_types table)

**Referenced By:**
- PRD 04: Leave Workflow (leave type selection, validation)
- PRD 05: Calendar Views (color coding, legend)
- PRD 06: Allowance Management (allowance calculation)
- PRD 09: Reporting (leave type breakdown)

### 9.2 External References

- v1 Leave Type Model: `lib/model/db/leave_type.js`
- v1 Leave Type Routes: `lib/route/settings.js` (lines 237-363)
- v1 Leave Type Tests: `t/integration/leave_type/`
- v1 Color Coding: `t/integration/leave_type/colouring_on_calendar.js`

---

## 10. Open Questions & Future Enhancements

### 10.1 Open Questions

1. Should leave type colors support custom hex codes in UI, or only predefined palette?
2. Should we support leave type categories/groups (e.g., "Paid Leave" vs. "Unpaid Leave")?
3. Should leave type limits be configurable per user (override company default)?
4. Should we support half-day leave types (morning/afternoon only)?
5. Should auto-approve send notifications to supervisors?

### 10.2 Future Enhancements

**v2.1 Enhancements:**
- Drag-and-drop reordering of leave types
- Leave type templates (quick setup for common types)
- Leave type categories/grouping
- Custom color picker (beyond predefined palette)
- Leave type icons (in addition to colors)

**v2.2 Enhancements:**
- Leave type approval rules (different approvers per type)
- Leave type visibility (hide certain types from certain users)
- Leave type scheduling (types available only in certain periods)
- Leave type dependencies (e.g., must use vacation before unpaid)

**v3.0 Enhancements:**
- Multi-language leave type names
- Leave type workflows (custom approval chains per type)
- Leave type integrations (sync with external systems)
- Leave type analytics (usage trends, forecasting)

---

## 11. Acceptance Criteria Summary

### Critical Acceptance Criteria

- [ ] Leave types can be created, edited, and deleted by admins
- [ ] Default leave types created during company registration
- [ ] Leave type properties (name, color, use_allowance, limit, auto_approve, sort_order) function correctly
- [ ] Leave types display in request form dropdown
- [ ] Leave type colors display in calendar views
- [ ] Leave type legend displays in calendar
- [ ] Allowance deduction respects `use_allowance` flag
- [ ] Leave type limits enforced during request submission
- [ ] Auto-approve workflow bypasses supervisor approval
- [ ] Leave types cannot be deleted if in use
- [ ] Data migration from v1 preserves all leave types

### High Priority Acceptance Criteria

- [ ] Leave type usage statistics calculated correctly
- [ ] Leave type limit resets at leave year boundary
- [ ] Color coding consistent across all views
- [ ] Validation prevents invalid leave type data
- [ ] Audit trail logs all leave type changes
- [ ] RLS policies enforce company-level access
- [ ] API endpoints secured and validated

### Medium Priority Acceptance Criteria

- [ ] Sort order controls display sequence
- [ ] Bulk editing saves all changes atomically
- [ ] Inline editing works smoothly
- [ ] Mobile-responsive leave type management
- [ ] Accessibility requirements met
- [ ] Error messages clear and helpful

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | PM Team | Initial draft based on v1 analysis and PRD standards |

---

## Approval

This document requires approval from:
- [ ] Executive Sponsor
- [ ] Technical Lead
- [ ] Product Manager
- [ ] Key Stakeholders

---

*End of PRD 03 - Leave Type Configuration*
