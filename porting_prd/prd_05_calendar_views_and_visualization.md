# PRD 05: Calendar Views & Visualization

**Document Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Draft  
**Author:** Senior Product Manager

---

## Executive Summary

This document defines all calendar and visualization requirements for TimeOff Management Application v2. The calendar system is a critical feature that provides visual representation of employee absences across individual, team, and company-wide views. It enables managers to identify coverage gaps, employees to view team availability, and administrators to monitor absence patterns.

### Business Context

Calendar visualization transforms raw absence data into actionable insights. Managers need to see who's out and when, employees need visibility into team schedules, and the system must support external calendar integrations for seamless workflow integration.

### Key Features

- **Multiple View Types:** Calendar (month/year), Team Wall Chart, List View
- **Flexible Filtering:** By department, user, leave type, date range
- **Visual Clarity:** Color-coded leave types, clear status indicators, legend
- **External Integration:** iCal feeds for Google Calendar, MS Outlook, Apple Calendar
- **Responsive Design:** Mobile-optimized views with touch-friendly interactions

### Success Criteria

- All leave requests display accurately across all view types
- Calendar loads in <2 seconds for companies with up to 500 employees
- External calendar feeds update within 15 minutes of changes
- Mobile users can view and navigate calendars effectively
- Color-blind users can distinguish leave types via patterns/labels

---

## 1. Feature Overview

### 1.1 Purpose

The calendar visualization system serves multiple stakeholder needs:

**For Employees:**
- View personal upcoming absences
- See team member availability
- Plan time off around team schedules
- Access calendar from mobile devices

**For Supervisors:**
- Monitor team coverage
- Identify scheduling conflicts
- Plan project timelines around absences
- View pending requests in context

**For Administrators:**
- Company-wide absence overview
- Department-level analysis
- Identify absence patterns
- Export data for reporting

### 1.2 User Roles & Permissions

| Role | Calendar View | Team View | Company View | Filters | Export |
|------|---------------|-----------|--------------|---------|--------|
| Employee | ✅ Own | ✅ (if enabled) | ❌ | Limited | ❌ |
| Supervisor | ✅ Own | ✅ Team | ✅ (if enabled) | Full | ✅ Team |
| Admin | ✅ All | ✅ All | ✅ All | Full | ✅ All |

**Permission Notes:**
- `share_all_absences` company setting controls employee visibility of other users
- `is_team_view_hidden` company setting can disable team view entirely
- Supervisors see only their department(s) unless granted company-wide access

---

## 2. Detailed Requirements

### 2.1 Calendar View (Month/Year Display)

#### 2.1.1 Functional Requirements

**FR-CAL-001: Month View Display**
- Display calendar in standard month grid (7 columns × 4-6 rows)
- Show month name and year prominently
- Highlight current day
- Display leave requests as colored blocks on respective dates
- Support navigation: Previous Month, Next Month, Today

**FR-CAL-002: Year View Display**
- Display 12-month overview in grid format (3×4 or 4×3)
- Show mini-calendars for each month
- Indicate days with absences via color/shading
- Click month to expand to full month view

**FR-CAL-003: Date Cell Content**
- Show date number
- Display leave indicators for users with absences
- Show half-day indicators (morning/afternoon) distinctly
- Truncate user names if space limited, show tooltip on hover
- Indicate public holidays with distinct styling

**FR-CAL-004: Multi-User Display**
- When viewing team/company calendar, show multiple users per date
- Stack or list users with absences on each date
- Limit visible users per cell (e.g., max 5), show "+X more" indicator
- Click cell to expand and see all users

**FR-CAL-005: Leave Status Indicators**
- **Approved:** Solid color block (from leave type)
- **Pending:** Striped/hatched pattern overlay
- **Rejected:** Not displayed (or grayed out if in personal view)
- **Pended Revoke:** Distinct border/icon overlay
- **Canceled:** Not displayed

#### 2.1.2 User Stories

**US-CAL-001:** As an employee, I want to view my approved and pending leave requests on a calendar so I can see my upcoming time off at a glance.

**Acceptance Criteria:**
- Personal calendar view shows only my leave requests
- Approved requests display in solid leave type color
- Pending requests show with striped pattern
- I can navigate between months easily
- Current day is highlighted

**US-CAL-002:** As a supervisor, I want to view my team's absences on a monthly calendar so I can identify coverage gaps.

**Acceptance Criteria:**
- Team calendar shows all team members' approved absences
- Each user's absence is labeled with their name
- I can see multiple team members on the same date
- Public holidays are clearly marked
- I can filter by specific team members

**US-CAL-003:** As an admin, I want to view company-wide absences so I can monitor overall absence patterns.

**Acceptance Criteria:**
- Company calendar shows all departments
- I can filter by department, leave type, or user
- Calendar loads within 2 seconds for up to 500 employees
- I can export calendar data to CSV

#### 2.1.3 Technical Specifications

**Database Queries:**
```sql
-- Get leave requests for calendar view
SELECT 
  lr.id,
  lr.date_start,
  lr.date_end,
  lr.day_part_start,
  lr.day_part_end,
  lr.status,
  u.name,
  u.lastname,
  lt.name as leave_type_name,
  lt.color
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE 
  lr.deleted_at IS NULL
  AND lr.status IN ('approved', 'new', 'pended_revoke')
  AND lr.date_end >= :start_date
  AND lr.date_start <= :end_date
  AND u.company_id = :company_id
  AND (:department_id IS NULL OR u.department_id = :department_id)
  AND (:user_id IS NULL OR lr.user_id = :user_id)
ORDER BY lr.date_start, u.lastname, u.name;
```

**API Endpoint:**
```
GET /api/calendar/month
Query Parameters:
  - year: number (required)
  - month: number (1-12, required)
  - department_id: UUID (optional)
  - user_id: UUID (optional)
  - leave_type_id: UUID (optional)
  - view: 'personal' | 'team' | 'company' (required)

Response:
{
  "year": 2026,
  "month": 1,
  "dates": [
    {
      "date": "2026-01-15",
      "is_public_holiday": false,
      "absences": [
        {
          "id": "uuid",
          "user_name": "John Doe",
          "leave_type": "Vacation",
          "color": "#3b82f6",
          "status": "approved",
          "day_part": "all",
          "is_multi_day": true,
          "start_date": "2026-01-15",
          "end_date": "2026-01-17"
        }
      ]
    }
  ],
  "public_holidays": [
    {
      "date": "2026-01-01",
      "name": "New Year's Day"
    }
  ]
}
```

**Component Structure:**
```
/components/calendar/
  ├── CalendarView.tsx          # Main calendar container
  ├── MonthView.tsx             # Month grid display
  ├── YearView.tsx              # Year overview
  ├── CalendarCell.tsx          # Individual date cell
  ├── CalendarHeader.tsx        # Navigation and controls
  ├── CalendarFilters.tsx       # Filter controls
  ├── CalendarLegend.tsx        # Color/status legend
  └── CalendarTooltip.tsx       # Hover details
```

---

### 2.2 Team View / Wall Chart

#### 2.2.1 Functional Requirements

**FR-TEAM-001: Wall Chart Display**
- Display horizontal timeline (rows = users, columns = dates)
- Show configurable date range (default: current month)
- List users vertically with names
- Show leave blocks spanning multiple days as continuous bars
- Include department headers if viewing multiple departments

**FR-TEAM-002: User Rows**
- Display user name and avatar/initials
- Show user's department (if multi-department view)
- Highlight current user's row
- Sort users by: lastname, department, or custom order

**FR-TEAM-003: Date Columns**
- Show dates horizontally across top
- Highlight weekends with different background
- Mark public holidays
- Show current day indicator
- Support horizontal scrolling for wide date ranges

**FR-TEAM-004: Leave Blocks**
- Render leave as colored horizontal bar spanning dates
- Show leave type via color
- Display leave type name on hover
- Indicate half-days with half-height bars
- Show status (pending/approved) via pattern or border

**FR-TEAM-005: Compact Mode**
- Toggle between detailed and compact views
- Compact: smaller row height, abbreviated names
- Detailed: full names, avatars, more spacing

#### 2.2.2 User Stories

**US-TEAM-001:** As a supervisor, I want to see a wall chart of my team's absences so I can quickly identify who is out and when.

**Acceptance Criteria:**
- Wall chart shows all my team members in rows
- Dates are displayed horizontally
- Leave requests appear as colored bars
- I can see the entire month without excessive scrolling
- Weekends and holidays are visually distinct

**US-TEAM-002:** As a project manager, I want to filter the wall chart by project team so I can plan project work around absences.

**Acceptance Criteria:**
- I can filter by team/project (if feature enabled)
- Only selected team members appear in wall chart
- Filter persists during navigation
- I can clear filters easily

#### 2.2.3 Technical Specifications

**API Endpoint:**
```
GET /api/calendar/wall-chart
Query Parameters:
  - start_date: ISO date (required)
  - end_date: ISO date (required)
  - department_id: UUID (optional)
  - team_id: UUID (optional)
  - user_ids: UUID[] (optional, comma-separated)

Response:
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "users": [
    {
      "id": "uuid",
      "name": "John Doe",
      "department": "Engineering",
      "absences": [
        {
          "id": "uuid",
          "start_date": "2026-01-15",
          "end_date": "2026-01-17",
          "day_part_start": "all",
          "day_part_end": "all",
          "leave_type": "Vacation",
          "color": "#3b82f6",
          "status": "approved"
        }
      ]
    }
  ],
  "public_holidays": [...]
}
```

---

### 2.3 List View (Table Format)

#### 2.3.1 Functional Requirements

**FR-LIST-001: Table Display**
- Display leave requests in tabular format
- Columns: User, Leave Type, Start Date, End Date, Days, Status, Approver
- Support sorting by any column
- Support pagination (default: 50 per page)
- Show total count of requests

**FR-LIST-002: Filtering**
- Filter by date range (default: current month)
- Filter by department
- Filter by leave type
- Filter by status (approved, pending, rejected, all)
- Filter by user (search/autocomplete)
- Combine multiple filters

**FR-LIST-003: Status Indicators**
- Color-code rows by status
- Show status badge/icon
- Display approver name for approved/rejected
- Show decision date

**FR-LIST-004: Actions**
- Click row to view request details
- Export filtered results to CSV
- Print-friendly view
- Quick approve/reject (if supervisor/admin)

#### 2.3.2 User Stories

**US-LIST-001:** As an admin, I want to view all leave requests in a list so I can search and filter specific requests.

**Acceptance Criteria:**
- List shows all requests with key details
- I can sort by any column
- I can filter by multiple criteria
- I can export filtered results
- Pagination works smoothly

**US-LIST-002:** As a supervisor, I want to see pending requests in list view so I can process them efficiently.

**Acceptance Criteria:**
- I can filter to show only pending requests
- Requests are sorted by submission date
- I can click to view details and approve/reject
- List updates after I take action

#### 2.3.3 Technical Specifications

**API Endpoint:**
```
GET /api/calendar/list
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 50, max: 200)
  - sort_by: string (default: 'created_at')
  - sort_order: 'asc' | 'desc' (default: 'desc')
  - start_date: ISO date (optional)
  - end_date: ISO date (optional)
  - department_id: UUID (optional)
  - leave_type_id: UUID (optional)
  - status: leave_status[] (optional)
  - user_id: UUID (optional)
  - search: string (optional, searches user names)

Response:
{
  "total": 150,
  "page": 1,
  "limit": 50,
  "requests": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "department": "Engineering"
      },
      "leave_type": {
        "id": "uuid",
        "name": "Vacation",
        "color": "#3b82f6"
      },
      "date_start": "2026-01-15",
      "date_end": "2026-01-17",
      "day_part_start": "all",
      "day_part_end": "all",
      "days_deducted": 3,
      "status": "approved",
      "approver": {
        "id": "uuid",
        "name": "Jane Smith"
      },
      "decided_at": "2026-01-10T14:30:00Z",
      "created_at": "2026-01-08T09:15:00Z"
    }
  ]
}
```

---

### 2.4 View Filtering & Controls

#### 2.4.1 Functional Requirements

**FR-FILTER-001: Department Filter**
- Dropdown/select showing all departments user has access to
- "All Departments" option (if admin)
- Filter persists across view changes
- Update URL query parameters

**FR-FILTER-002: User Filter**
- Autocomplete search for user names
- Show user's department in results
- Support multiple user selection (for wall chart)
- Clear selection button

**FR-FILTER-003: Leave Type Filter**
- Multi-select dropdown for leave types
- Show color indicator next to each type
- "All Types" option
- Filter applies to all views

**FR-FILTER-004: Date Range Filter**
- Predefined ranges: This Month, Next Month, This Quarter, This Year
- Custom date range picker
- Validate end date >= start date
- Default to current month

**FR-FILTER-005: Status Filter**
- Checkboxes: Approved, Pending, Rejected, Pended Revoke
- Default: Approved + Pending
- Admin can see all statuses
- Employees see only their own rejected requests

**FR-FILTER-006: Filter Persistence**
- Save filter state in URL query parameters
- Restore filters on page reload
- Clear all filters button
- Show active filter count indicator

#### 2.4.2 User Stories

**US-FILTER-001:** As a supervisor, I want to filter the calendar by my department so I only see relevant absences.

**Acceptance Criteria:**
- Department filter is easily accessible
- Selecting department updates all views
- Filter state persists when switching views
- I can clear the filter to see all

---

### 2.5 Color Coding & Visual Indicators

#### 2.5.1 Functional Requirements

**FR-COLOR-001: Leave Type Colors**
- Each leave type has configurable color (hex code)
- Colors must meet WCAG AA contrast requirements
- Default color palette provided
- Admin can customize colors

**FR-COLOR-002: Status Patterns**
- **Approved:** Solid color fill
- **Pending:** Diagonal stripes or hatched pattern
- **Pended Revoke:** Solid color with warning icon/border
- **Rejected:** Not shown (or grayed out in personal view)

**FR-COLOR-003: Half-Day Indicators**
- Morning half-day: Top half of cell colored
- Afternoon half-day: Bottom half of cell colored
- Visual distinction from full-day absences

**FR-COLOR-004: Public Holidays**
- Distinct background color (e.g., light gray)
- Holiday name displayed or shown on hover
- Not counted as working days

**FR-COLOR-005: Weekends**
- Different background color from weekdays
- Clearly distinguishable
- Not counted as working days

**FR-COLOR-006: Current Day**
- Highlighted border or background
- Distinct from other indicators
- Visible across all view types

#### 2.5.2 Legend Display

**FR-LEGEND-001: Color Legend**
- Display all active leave types with colors
- Show status pattern examples (approved, pending)
- Indicate half-day representation
- Collapsible/expandable
- Always visible or accessible via button

**FR-LEGEND-002: Accessibility**
- Provide text labels in addition to colors
- Support pattern overlays for color-blind users
- Ensure sufficient contrast ratios
- Keyboard navigable

---

### 2.6 Calendar Navigation

#### 2.6.1 Functional Requirements

**FR-NAV-001: Month Navigation**
- Previous Month button
- Next Month button
- Today button (returns to current month)
- Month/Year selector dropdown
- Keyboard shortcuts (arrow keys)

**FR-NAV-002: View Switching**
- Toggle between Calendar, Wall Chart, List views
- Preserve filters when switching views
- Remember last used view per user (localStorage)
- Smooth transitions

**FR-NAV-003: Zoom Controls**
- Month view ↔ Year view toggle
- Wall chart: adjust date range (week, month, quarter)
- List view: adjust page size

**FR-NAV-004: Responsive Behavior**
- Mobile: Swipe left/right to change months
- Mobile: Tap date to see details
- Mobile: Simplified navigation controls
- Desktop: Hover tooltips, keyboard shortcuts

---

### 2.7 External Calendar Integration

#### 2.7.1 iCal Feed Generation

**FR-ICAL-001: Personal iCal Feed**
- Generate unique iCal URL per user
- Include user's approved leave requests
- Update feed within 15 minutes of changes
- Support standard iCal format (RFC 5545)

**FR-ICAL-002: Feed Security**
- Use secure token in URL (UUID)
- Allow user to regenerate token (invalidates old URL)
- No authentication required for feed access (token is secret)
- Rate limiting to prevent abuse

**FR-ICAL-003: Feed Content**
- Event title: "[Leave Type] - [User Name]"
- Event description: Employee comment (if any)
- All-day events for full days
- Timed events for half-days (9am-1pm, 1pm-5pm)
- Include only approved requests

**FR-ICAL-004: Feed Management**
- User can view their iCal URL in settings
- Copy URL button
- Instructions for adding to Google Calendar, Outlook, Apple Calendar
- Option to disable feed

#### 2.7.2 User Stories

**US-ICAL-001:** As an employee, I want to subscribe to my leave calendar in Google Calendar so I can see my time off alongside my work calendar.

**Acceptance Criteria:**
- I can find my iCal feed URL in my profile/settings
- URL is unique and secure
- Approved leave appears in my Google Calendar within 15 minutes
- Events show correct dates and leave type
- I can regenerate the URL if needed

**US-ICAL-002:** As a supervisor, I want to subscribe to my team's calendar feed so I can see team absences in Outlook.

**Acceptance Criteria:**
- Team calendar feed is available (if feature enabled)
- Feed includes all team members' approved absences
- Each event shows which team member is out
- Feed updates automatically

#### 2.7.3 Technical Specifications

**API Endpoint:**
```
GET /api/calendar/ical/:token
Path Parameters:
  - token: UUID (user's unique feed token)

Response:
Content-Type: text/calendar
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimeOff Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:My Time Off
X-WR-TIMEZONE:Europe/London
BEGIN:VEVENT
UID:leave-uuid@timeoff.app
DTSTAMP:20260109T120000Z
DTSTART;VALUE=DATE:20260115
DTEND;VALUE=DATE:20260118
SUMMARY:Vacation - John Doe
DESCRIPTION:Family trip
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
```

**Database Schema Addition:**
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN ical_feed_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_users_ical_token ON users(ical_feed_token);
```

**Feed Caching:**
- Cache iCal feeds for 15 minutes
- Invalidate cache on leave request approval/rejection/cancellation
- Use Supabase Edge Functions or Next.js API routes with caching headers

---

### 2.8 Responsive Design & Mobile Experience

#### 2.8.1 Functional Requirements

**FR-MOBILE-001: Mobile Calendar View**
- Single month view (no year view on mobile)
- Larger touch targets (min 44×44px)
- Swipe gestures for month navigation
- Tap date to see full details in modal/drawer
- Simplified date cells (show count, not all names)

**FR-MOBILE-002: Mobile Wall Chart**
- Horizontal scroll for dates
- Sticky user names column
- Pinch to zoom (optional)
- Rotate to landscape for better view
- Simplified user rows

**FR-MOBILE-003: Mobile List View**
- Card-based layout instead of table
- Swipe to reveal actions
- Infinite scroll or pagination
- Collapsible filter panel

**FR-MOBILE-004: Breakpoints**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Adjust layout and controls per breakpoint

#### 2.8.2 Performance Requirements

**NFR-MOBILE-001: Load Time**
- Initial calendar load: < 3 seconds on 3G
- View switching: < 500ms
- Filter application: < 300ms

**NFR-MOBILE-002: Data Efficiency**
- Lazy load data outside visible viewport
- Compress API responses
- Cache frequently accessed data (localStorage)
- Minimize re-renders

---

## 3. User Experience Specifications

### 3.1 Wireframes & Mockups

#### 3.1.1 Month Calendar View

```
┌─────────────────────────────────────────────────────────┐
│  ← January 2026 →          [Today]  [Filters ▼]  [⚙]   │
├─────────────────────────────────────────────────────────┤
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat               │
├────────────────────────────────────────────────────────┤
│       │  1   │  2   │  3   │  4   │  5   │  6          │
│       │      │      │      │      │      │              │
├───────┼──────┼──────┼──────┼──────┼──────┼──────────────┤
│  7    │  8   │  9   │ 10   │ 11   │ 12   │ 13          │
│       │      │      │      │      │      │              │
├───────┼──────┼──────┼──────┼──────┼──────┼──────────────┤
│ 14    │ 15   │ 16   │ 17   │ 18   │ 19   │ 20          │
│       │[J.Doe│ J.Doe│ J.Doe│      │      │              │
│       │ Vac] │ Vac] │ Vac] │      │      │              │
├───────┼──────┼──────┼──────┼──────┼──────┼──────────────┤
│ 21    │ 22   │ 23   │ 24   │ 25   │ 26   │ 27          │
│       │      │      │      │      │      │              │
└───────┴──────┴──────┴──────┴──────┴──────┴──────────────┘

Legend: ■ Vacation  ■ Sick  ▦ Pending
```

#### 3.1.2 Wall Chart View

```
┌──────────────────────────────────────────────────────────┐
│  Team Calendar: Engineering Dept    Jan 1 - Jan 31, 2026 │
├──────────────────────────────────────────────────────────┤
│ User          │ 1  2  3  4  5  6  7  8  9 10 11 12 13... │
├───────────────┼──────────────────────────────────────────┤
│ John Doe      │                   [====Vacation====]     │
│ Jane Smith    │       [Sick]                             │
│ Bob Johnson   │                                          │
│ Alice Brown   │                               [==Vac==]  │
└───────────────┴──────────────────────────────────────────┘
```

#### 3.1.3 List View

```
┌──────────────────────────────────────────────────────────┐
│  Leave Requests                    [Export CSV] [Print]  │
├──────────────────────────────────────────────────────────┤
│ Filters: [Department ▼] [Leave Type ▼] [Status ▼]       │
├──────────────────────────────────────────────────────────┤
│ User       │ Type    │ Start      │ End        │ Status  │
├────────────┼─────────┼────────────┼────────────┼─────────┤
│ John Doe   │ Vacation│ 2026-01-15 │ 2026-01-17 │ ✓ Appr. │
│ Jane Smith │ Sick    │ 2026-01-05 │ 2026-01-05 │ ✓ Appr. │
│ Bob J.     │ Vacation│ 2026-01-22 │ 2026-01-26 │ ⏳ Pend. │
└────────────┴─────────┴────────────┴────────────┴─────────┘
                                    Page 1 of 3  [< 1 2 3 >]
```

### 3.2 Interaction Patterns

**Hover Behaviors:**
- Calendar cell: Show tooltip with full user names and leave types
- Leave block: Show tooltip with dates, status, approver
- User name: Show user profile preview

**Click Behaviors:**
- Calendar date: Open modal with all absences for that date
- Leave request: Navigate to request detail page
- User name: Navigate to user profile or filter by user

**Keyboard Navigation:**
- Arrow keys: Navigate between dates
- Enter: Select/open current date
- Tab: Move between controls
- Escape: Close modals/filters

---

## 4. Integration Points

### 4.1 Dependencies on Other PRDs

**PRD 01 (User Management):**
- User authentication for calendar access
- Role-based permissions for view types
- User profile data for display

**PRD 02 (Company Structure):**
- Department data for filtering
- Company settings: `share_all_absences`, `is_team_view_hidden`
- Public holidays from bank_holidays table

**PRD 03 (Leave Types):**
- Leave type colors for visualization
- Leave type names for legend
- Leave type configuration

**PRD 04 (Leave Workflow):**
- Leave request data (dates, status, approver)
- Status changes trigger calendar updates
- Half-day support (day_part fields)

**PRD 12 (Database Schema):**
- leave_requests table
- users table
- departments table
- leave_types table
- bank_holidays table

### 4.2 External Integrations

**Google Calendar:**
- iCal feed subscription
- Standard iCalendar format (RFC 5545)

**Microsoft Outlook:**
- iCal feed subscription
- Outlook-specific properties (optional)

**Apple Calendar:**
- iCal feed subscription
- iOS/macOS native support

---

## 5. Technical Implementation

### 5.1 Component Architecture

**Server Components (Next.js):**
- CalendarPage: Main page component, fetches initial data
- WallChartPage: Wall chart page with SSR
- ListPage: List view with server-side pagination

**Client Components:**
- CalendarView: Interactive calendar with state management
- CalendarFilters: Filter controls with local state
- CalendarCell: Individual date cell with hover effects
- LeaveTooltip: Hover tooltip with leave details

### 5.2 State Management

**Server State (Supabase):**
- Leave requests
- User data
- Department data
- Leave types

**Client State (React):**
- Current view (calendar/wall/list)
- Active filters
- Selected date range
- UI state (modals, tooltips)

**URL State:**
- Query parameters for filters
- Shareable URLs with filter state

### 5.3 Data Fetching Strategy

**Initial Load:**
- Server-side fetch for current month
- Prefetch adjacent months (optional)

**Navigation:**
- Client-side fetch for new months
- Cache previous months in memory

**Real-time Updates:**
- Supabase Realtime subscriptions for leave_requests table
- Auto-refresh calendar when changes detected
- Show notification of updates

### 5.4 Performance Optimization

**Rendering:**
- Virtualize long lists (wall chart, list view)
- Memoize calendar cells
- Debounce filter changes

**Data:**
- Index database queries (see PRD 12)
- Limit data fetching to visible date range
- Compress API responses

**Caching:**
- Cache calendar data in memory (React Query or SWR)
- Cache iCal feeds with 15-minute TTL
- Use Next.js caching for static data

---

## 6. Testing Requirements

### 6.1 Unit Tests

**Calendar Logic:**
- Date range calculations
- Day counting (excluding weekends/holidays)
- Half-day calculations
- Leave overlap detection

**Component Tests:**
- CalendarCell renders correctly
- Filters apply properly
- Navigation updates state

### 6.2 Integration Tests

**API Tests:**
- Calendar endpoint returns correct data
- Filters work as expected
- Pagination works correctly
- iCal feed generates valid format

**Database Tests:**
- Queries return correct leave requests
- RLS policies enforce permissions
- Indexes improve query performance

### 6.3 End-to-End Tests

**User Flows:**
1. Employee views personal calendar
2. Supervisor views team wall chart
3. Admin filters company calendar by department
4. User subscribes to iCal feed in Google Calendar
5. Mobile user navigates calendar with swipe gestures

**Test Scenarios:**
- Calendar displays approved and pending requests correctly
- Filters update calendar view
- iCal feed updates after leave approval
- Mobile calendar is touch-friendly
- Color-blind mode is accessible

### 6.4 Performance Tests

**Load Testing:**
- Calendar loads in <2s for 500 employees
- Wall chart renders 50 users without lag
- List view paginates smoothly

**Stress Testing:**
- 1000 concurrent users viewing calendars
- 10,000 leave requests in database
- iCal feed generation under load

---

## 7. Security & Privacy

### 7.1 Access Control

**Row Level Security (RLS):**
- Users can only view calendars they have permission to see
- Employees see own calendar + team (if enabled)
- Supervisors see department calendars
- Admins see all calendars

**API Authorization:**
- Verify user role before returning calendar data
- Enforce department-level permissions
- Validate filter parameters

### 7.2 Data Privacy

**Personal Information:**
- Do not expose employee comments in team/company views
- Limit user details in shared calendars
- Respect `share_all_absences` setting

**iCal Feeds:**
- Secure token prevents unauthorized access
- Token regeneration invalidates old URLs
- Rate limiting prevents enumeration attacks

---

## 8. Accessibility

### 8.1 WCAG 2.1 Level AA Compliance

**Visual:**
- Color contrast ratio ≥ 4.5:1 for text
- Color contrast ratio ≥ 3:1 for UI components
- Do not rely on color alone (use patterns/labels)

**Keyboard:**
- All interactive elements keyboard accessible
- Logical tab order
- Visible focus indicators
- Keyboard shortcuts documented

**Screen Readers:**
- Semantic HTML (table, nav, button)
- ARIA labels for icons and controls
- ARIA live regions for dynamic updates
- Alt text for visual indicators

**Cognitive:**
- Clear, consistent navigation
- Descriptive labels
- Error messages are helpful
- Avoid flashing/blinking content

### 8.2 Color-Blind Support

**Deuteranopia/Protanopia (Red-Green):**
- Use blue, yellow, purple in addition to red/green
- Add patterns (stripes, dots) to colors
- Provide text labels

**Tritanopia (Blue-Yellow):**
- Use red, green, purple
- Add patterns

**Monochromacy:**
- Ensure all information conveyed by color is also conveyed by patterns, labels, or icons

---

## 9. Migration from v1

### 9.1 Feature Parity Checklist

| v1 Feature | v2 Equivalent | Status | Notes |
|------------|---------------|--------|-------|
| Calendar view | Month/Year view | ✅ | Enhanced with year view |
| Team view | Wall chart | ✅ | Improved layout |
| iCal feed | iCal feed | ✅ | Per-user secure tokens |
| Department filter | Department filter | ✅ | Enhanced with multi-select |
| Leave type colors | Leave type colors | ✅ | Same functionality |
| Public holidays | Public holidays | ✅ | From bank_holidays table |

### 9.2 Data Migration

**No data migration required** - Calendar views read from existing leave_requests table.

**Configuration Migration:**
- Migrate leave type colors from v1 LeaveTypes table
- Migrate company settings: `share_all_absences`, `is_team_view_hidden`

### 9.3 User Training

**Key Changes:**
- New wall chart layout
- Enhanced filtering options
- Mobile-optimized views
- Secure iCal feed tokens (regenerate if needed)

---

## 10. Future Enhancements (Out of Scope for v2.0)

### 10.1 Potential Features

**Advanced Visualizations:**
- Heatmap view (absence density)
- Gantt chart for project planning
- Capacity planning view

**Collaboration:**
- Share calendar views via link
- Embed calendar in external sites
- Calendar comments/notes

**Analytics:**
- Absence trends over time
- Department comparison charts
- Predictive absence forecasting

**Integrations:**
- Two-way sync with Google Calendar
- Slack notifications with calendar preview
- Microsoft Teams integration

**Customization:**
- Custom calendar themes
- User-defined color schemes
- Configurable calendar layouts

---

## 11. Acceptance Criteria

### 11.1 Functional Acceptance

- [ ] Month view displays all approved and pending leave requests
- [ ] Year view shows 12-month overview with absence indicators
- [ ] Wall chart displays team absences in timeline format
- [ ] List view shows filterable, sortable table of requests
- [ ] Filters work across all view types
- [ ] iCal feed generates valid calendar format
- [ ] Public holidays display correctly
- [ ] Half-days render distinctly from full days
- [ ] Status indicators (pending, approved) are clear
- [ ] Navigation (prev/next month, today) works smoothly

### 11.2 Performance Acceptance

- [ ] Calendar loads in <2 seconds for 500 employees
- [ ] View switching completes in <500ms
- [ ] Filter application completes in <300ms
- [ ] iCal feed updates within 15 minutes
- [ ] Mobile calendar loads in <3 seconds on 3G

### 11.3 Accessibility Acceptance

- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces calendar changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Color-blind users can distinguish leave types
- [ ] Focus indicators are visible

### 11.4 Security Acceptance

- [ ] RLS policies enforce view permissions
- [ ] iCal tokens are secure and unique
- [ ] API endpoints validate user authorization
- [ ] Personal data is protected in shared views

---

## 12. Dependencies & References

### 12.1 Related PRDs

- **PRD 00:** Project Overview (architecture, tech stack)
- **PRD 01:** User Management (authentication, roles)
- **PRD 02:** Company Structure (departments, holidays)
- **PRD 03:** Leave Types (colors, configuration)
- **PRD 04:** Leave Workflow (request data, status)
- **PRD 12:** Database Schema (tables, queries)

### 12.2 External Documentation

- [iCalendar RFC 5545](https://tools.ietf.org/html/rfc5545)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/calendar)

### 12.3 Legacy Code References

**v1 Repository:**
- `views/calendar.hbs` - Calendar view template
- `views/teamview.hbs` - Wall chart template
- `routes/calendar.js` - Calendar routes
- `lib/route_helpers/calendar.js` - Calendar logic
- `lib/model/leave.js` - Leave model with calendar methods

---

## 13. Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | PM Team | Initial draft based on v1 analysis and v2 requirements |

---

## 14. Approval

This document requires approval from:
- [ ] Executive Sponsor
- [ ] Technical Lead
- [ ] Product Manager
- [ ] UX Designer
- [ ] Key Stakeholders

---

*End of PRD 05 - Calendar Views & Visualization*
