# PRD 06: Employee Allowance Management

**Document Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Draft  
**Author:** Senior Product Manager

---

## Executive Summary

This document defines the requirements for Employee Allowance Management in TimeOff Management Application v2. The allowance system is the foundation for tracking how many days off employees are entitled to use, calculating pro-rated allowances for new hires, managing manual adjustments (days in lieu), implementing carry-over rules, and providing visibility into allowance consumption.

### Business Context

Accurate allowance management is critical for:
- **Compliance**: Ensuring employees receive their contractual entitlements
- **Transparency**: Employees can see their available days at any time
- **Planning**: Supervisors can make informed approval decisions
- **Reporting**: HR can track allowance usage across the organization

### Goals and Objectives

1. **Accurate Calculation**: Automatically calculate annual and pro-rated allowances
2. **Flexible Adjustments**: Support manual adjustments for special circumstances
3. **Carry-Over Support**: Implement configurable carry-over rules
4. **Real-Time Tracking**: Show current allowance status accounting for approved/pending requests
5. **Multi-Type Support**: Track allowances separately by leave type where applicable
6. **Audit Trail**: Maintain history of all allowance changes

### Success Criteria

- ✅ Allowance calculations match v1 logic exactly
- ✅ Pro-rating works correctly for mid-year hires and leavers
- ✅ Manual adjustments are tracked with audit trail
- ✅ Carry-over rules apply automatically at year boundaries
- ✅ Allowance displays are accurate and real-time
- ✅ Negative allowance handling works as configured

---

## 1. Allowance Calculation System

### 1.1 Base Allowance Sources

Allowances are determined by a hierarchy of sources:

**Priority Order:**
1. **Department Allowance** (if set on department)
2. **Company Default** (fallback if department has no allowance)

**Functional Requirements:**

**FR-6.1.1: Department-Level Allowance**
- Departments can define a base allowance (e.g., 25 days)
- This allowance applies to all employees in that department
- Stored in `departments.allowance` field
- Must be between 0 and 365 days
- Can be decimal (e.g., 25.5 days)

**FR-6.1.2: Company Default Allowance**
- If department allowance is NULL, system uses company default
- Company default is implicit (typically 20-25 days based on country)
- Configurable in company settings

**FR-6.1.3: Allowance Display**
- Show which source is being used (department vs company default)
- Display in employee profile and admin views
- Indicate if allowance is inherited from department

### 1.2 Pro-Rated Allowance Calculation

**FR-6.2.1: New Hire Pro-Rating**

When an employee starts mid-year, their allowance is pro-rated based on:
- `users.start_date`
- `companies.start_of_new_year` (month when allowance year begins)
- Base allowance from department or company

**Calculation Logic:**
```
remaining_months = months from start_date to end of allowance year
total_months = 12
pro_rated_allowance = base_allowance * (remaining_months / total_months)
```

**Example:**
- Base allowance: 24 days
- Allowance year: January 1 - December 31
- Start date: July 1, 2026
- Remaining months: 6 (July - December)
- Pro-rated allowance: 24 * (6/12) = 12 days

**FR-6.2.2: Mid-Year Leaver Pro-Rating**

When an employee has an `end_date` set:
- Calculate allowance only for months employed
- Formula: `base_allowance * (months_employed / 12)`
- Round to 2 decimal places

**FR-6.2.3: Partial Month Handling**
- If start date is after the 15th of the month, exclude that month
- If start date is on or before the 15th, include that month
- Same logic applies for end dates

**FR-6.2.4: Accrued Allowance Mode**

Departments can enable `is_accrued_allowance` flag:
- Allowance accrues monthly rather than granted upfront
- Each month, employee gains `base_allowance / 12` days
- Calculation: `months_completed * (base_allowance / 12)`
- Cannot use allowance not yet accrued

### 1.3 Leave Type Specific Allowances

**FR-6.3.1: Leave Types Using Allowance**

Leave types have `use_allowance` boolean:
- If `true`: deducts from employee's main allowance
- If `false`: does not deduct from allowance (e.g., sick leave, unpaid leave)

**FR-6.3.2: Leave Type Limits**

Leave types can have a `limit` field:
- Maximum days of this type that can be taken per year
- Independent of main allowance
- Example: "Work from home" limited to 10 days/year

**FR-6.3.3: Allowance Tracking by Type**
- Track total allowance consumed
- Track allowance consumed per leave type
- Display breakdown in employee view
- Support reporting by leave type

---

## 2. Manual Allowance Adjustments

### 2.1 Adjustment Types

**FR-6.4.1: Days in Lieu**
- Admins can add extra days for working weekends/holidays
- Positive adjustment increases allowance
- Recorded in `user_allowance_adjustments` table

**FR-6.4.2: Allowance Deductions**
- Negative adjustments reduce allowance
- Use cases: unpaid leave taken, disciplinary deductions
- Requires admin permission

**FR-6.4.3: Adjustment Tracking**

Each adjustment must record:
- `user_id`: Employee receiving adjustment
- `year`: Allowance year affected
- `adjustment`: Number of days (positive or negative)
- `created_at`: When adjustment was made
- Audit trail: Who made the adjustment (via audit_logs)

### 2.2 Adjustment Rules

**FR-6.5.1: Year-Specific Adjustments**
- Adjustments apply to specific allowance year
- One adjustment record per user per year
- Multiple adjustments in same year are cumulative

**FR-6.5.2: Adjustment Limits**
- No hard limit on adjustment amount
- System should warn if adjustment results in negative total allowance
- Admin can override warnings

**FR-6.5.3: Adjustment Permissions**
- Only admins can create/modify adjustments
- Employees can view their own adjustments
- Supervisors can view team member adjustments (read-only)

### 2.3 Adjustment Display

**FR-6.6.1: Allowance Breakdown Display**

Show employees:
```
Base Allowance:        25.0 days
Pro-rated Adjustment:  -6.25 days (started July 1)
Manual Adjustment:     +2.0 days (days in lieu)
Carry-Over:           +3.0 days (from 2025)
─────────────────────────────────
Total Allowance:       23.75 days

Used (Approved):       10.5 days
Pending Approval:      2.0 days
─────────────────────────────────
Available:            11.25 days
```

**FR-6.6.2: Adjustment History**
- Show all adjustments for current and past years
- Display date, amount, and reason (if provided)
- Link to admin who made adjustment

---

## 3. Carry-Over Rules

### 3.1 Carry-Over Configuration

**FR-6.7.1: Company-Wide Carry-Over Setting**

`companies.carry_over` field defines maximum days that can be carried over:
- `0`: No carry-over allowed
- `N`: Up to N days can be carried over
- `-1` or `NULL`: Unlimited carry-over (all unused days)

**FR-6.7.2: Carry-Over Calculation**

At the start of new allowance year:
```
unused_days = total_allowance - days_used
carry_over_days = MIN(unused_days, company.carry_over)
```

If `carry_over = 0`: No days carried over
If `carry_over = 5`: Maximum 5 days carried over
If `carry_over = -1`: All unused days carried over

### 3.2 Carry-Over Application

**FR-6.8.1: Automatic Carry-Over**
- System automatically calculates carry-over at year boundary
- Stored in `user_allowance_adjustments.carried_over_allowance`
- Applied to new year's allowance

**FR-6.8.2: Carry-Over Expiration**
- Carried-over days typically expire at end of following year
- Configuration option: `carry_over_expiration_months`
- Default: 12 months (use by end of next year)

**FR-6.8.3: Carry-Over Usage Priority**
- Option 1: Use carried-over days first (FIFO)
- Option 2: Use current year days first
- Configurable per company

### 3.3 Carry-Over Edge Cases

**FR-6.9.1: Mid-Year Hire with Carry-Over**
- Employees starting mid-year cannot have carry-over
- Carry-over only applies to employees employed for full previous year

**FR-6.9.2: Leaver with Carry-Over**
- If employee leaves mid-year, carried-over days are lost
- No pro-rating of carried-over allowance

**FR-6.9.3: Department Change Impact**
- If employee changes departments with different allowances
- Carry-over is based on previous year's actual allowance
- New year uses new department's base allowance

---

## 4. Allowance Consumption Tracking

### 4.1 Real-Time Allowance Calculation

**FR-6.10.1: Current Allowance Formula**

```
total_allowance = base_allowance 
                + pro_rated_adjustment
                + manual_adjustment
                + carried_over_allowance

used_allowance = SUM(approved_leave_days WHERE use_allowance = true)

pending_allowance = SUM(pending_leave_days WHERE use_allowance = true)

available_allowance = total_allowance - used_allowance - pending_allowance
```

**FR-6.10.2: Leave Day Calculation**

For each leave request, calculate days based on:
- `date_start`, `date_end`
- `day_part_start`, `day_part_end` (all, morning, afternoon)
- User's working schedule (which days are working days)
- Company/department public holidays

**Half-Day Logic:**
- `all` = 1.0 day
- `morning` or `afternoon` = 0.5 day
- If start and end on same day with different parts = 0.5 day

**Multi-Day Logic:**
```
total_days = 0
for each date in range(date_start, date_end):
  if date is working day AND not public holiday:
    if date == date_start:
      total_days += day_part_start value
    else if date == date_end:
      total_days += day_part_end value
    else:
      total_days += 1.0
```

### 4.2 Allowance Status Indicators

**FR-6.11.1: Visual Indicators**

Display allowance status with color coding:
- **Green**: Available allowance > 5 days
- **Yellow**: Available allowance 1-5 days
- **Red**: Available allowance ≤ 0 days
- **Orange**: Pending requests exceed available allowance

**FR-6.11.2: Allowance Warnings**

Show warnings when:
- Available allowance is low (< 2 days)
- Pending requests would exceed allowance
- Attempting to request more than available
- Negative allowance (if permitted)

### 4.3 Negative Allowance Handling

**FR-6.12.1: Negative Allowance Permission**

Company setting: `allow_negative_allowance`
- If `true`: Employees can request leave beyond allowance
- If `false`: System blocks requests exceeding allowance

**FR-6.12.2: Negative Allowance Display**
- Show negative balance clearly (e.g., "-2.5 days")
- Highlight in red
- Show warning message to employee and supervisor

**FR-6.12.3: Negative Allowance Recovery**
- Negative balance carries over to next year
- Deducted from next year's allowance
- Example: -2 days in 2026 → 2027 allowance reduced by 2 days

---

## 5. User Interface Requirements

### 5.1 Employee Allowance View

**FR-6.13.1: Dashboard Widget**

Display on employee dashboard:
```
┌─────────────────────────────────┐
│ Your Allowance (2026)           │
├─────────────────────────────────┤
│ Total: 23.75 days               │
│ Used: 10.5 days                 │
│ Pending: 2.0 days               │
│ Available: 11.25 days           │
│                                 │
│ [View Details] [Request Leave]  │
└─────────────────────────────────┘
```

**FR-6.13.2: Detailed Allowance Page**

Full breakdown showing:
- Base allowance source (department/company)
- Pro-rating calculation (if applicable)
- Manual adjustments with dates and reasons
- Carry-over from previous year
- Breakdown by leave type
- Historical usage (past years)

**FR-6.13.3: Allowance History Graph**

Visual representation:
- Bar chart showing allowance vs usage by month
- Line graph showing available allowance over time
- Comparison with previous years

### 5.2 Admin Allowance Management

**FR-6.14.1: User Allowance Admin View**

For each employee, admins can:
- View complete allowance breakdown
- Add/edit manual adjustments
- Override pro-rating calculations
- View allowance history across all years
- Export allowance data

**FR-6.14.2: Bulk Allowance Adjustment**

Admin feature to:
- Select multiple employees
- Apply same adjustment to all (e.g., +1 day for all)
- Specify reason for bulk adjustment
- Preview before applying

**FR-6.14.3: Allowance Override**

In exceptional cases, admin can:
- Set custom total allowance for specific user/year
- Bypass normal calculation rules
- Must provide justification
- Logged in audit trail

### 5.3 Supervisor Allowance View

**FR-6.15.1: Team Allowance Dashboard**

Supervisors can view:
- List of all team members with allowance status
- Sort by available allowance (ascending/descending)
- Filter by department
- Identify employees with low/negative allowance

**FR-6.15.2: Team Allowance Calendar**

Visual calendar showing:
- Team members' allowance usage over time
- Identify periods with many team members on leave
- Plan approval decisions based on team coverage

---

## 6. Technical Specifications

### 6.1 Database Schema

**Primary Tables:**

**`user_allowance_adjustments`**
```sql
CREATE TABLE user_allowance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  carried_over_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_year UNIQUE(user_id, year)
);
```

**Related Fields:**
- `departments.allowance`: Base allowance for department
- `departments.is_accrued_allowance`: Enable accrual mode
- `users.start_date`: For pro-rating
- `users.end_date`: For leaver pro-rating
- `companies.carry_over`: Max carry-over days
- `companies.start_of_new_year`: Allowance year start month
- `leave_types.use_allowance`: Whether type deducts allowance
- `leave_types.limit`: Per-type annual limit

### 6.2 API Endpoints

**GET `/api/allowance/user/:userId/year/:year`**
- Returns complete allowance breakdown for user/year
- Response:
```json
{
  "userId": "uuid",
  "year": 2026,
  "baseAllowance": 25.0,
  "proRatedAdjustment": -6.25,
  "manualAdjustment": 2.0,
  "carriedOver": 3.0,
  "totalAllowance": 23.75,
  "usedAllowance": 10.5,
  "pendingAllowance": 2.0,
  "availableAllowance": 11.25,
  "allowanceSource": "department",
  "isProRated": true,
  "proRatingReason": "Started July 1, 2026"
}
```

**POST `/api/allowance/adjustment`**
- Create manual allowance adjustment
- Request body:
```json
{
  "userId": "uuid",
  "year": 2026,
  "adjustment": 2.0,
  "reason": "Worked weekend of Jan 15-16"
}
```
- Permissions: Admin only
- Creates audit log entry

**GET `/api/allowance/user/:userId/history`**
- Returns allowance history for all years
- Includes adjustments, carry-overs, usage

**POST `/api/allowance/bulk-adjustment`**
- Apply adjustment to multiple users
- Request body:
```json
{
  "userIds": ["uuid1", "uuid2"],
  "year": 2026,
  "adjustment": 1.0,
  "reason": "Company-wide bonus day"
}
```
- Permissions: Admin only

**GET `/api/allowance/team/:supervisorId`**
- Returns allowance summary for all team members
- Used by supervisor dashboard

### 6.3 Calculation Functions

**Function: `calculateProRatedAllowance(userId, year)`**
```typescript
interface ProRatedResult {
  baseAllowance: number;
  proRatedAllowance: number;
  monthsEmployed: number;
  isProRated: boolean;
  reason: string;
}
```

**Function: `calculateAllowanceConsumption(userId, year)`**
```typescript
interface AllowanceConsumption {
  totalDays: number;
  approvedDays: number;
  pendingDays: number;
  byLeaveType: {
    leaveTypeId: string;
    leaveTypeName: string;
    days: number;
  }[];
}
```

**Function: `calculateCarryOver(userId, fromYear)`**
```typescript
interface CarryOverResult {
  unusedDays: number;
  maxCarryOver: number;
  actualCarryOver: number;
  expirationDate: Date;
}
```

### 6.4 Business Logic Layer

**Service: `AllowanceService`**

Methods:
- `getAllowanceBreakdown(userId, year)`: Complete allowance calculation
- `createAdjustment(userId, year, adjustment, reason)`: Add manual adjustment
- `calculateCarryOver(userId, year)`: Calculate and apply carry-over
- `getAvailableAllowance(userId, year)`: Real-time available allowance
- `canRequestLeave(userId, startDate, endDate, leaveTypeId)`: Validate if request is within allowance
- `getAllowanceHistory(userId)`: Historical allowance data

**Service: `LeaveCalculationService`**

Methods:
- `calculateLeaveDays(startDate, endDate, dayPartStart, dayPartEnd, userId)`: Calculate working days for leave request
- `isWorkingDay(date, userId)`: Check if date is working day for user
- `getPublicHolidays(userId, year)`: Get applicable public holidays

---

## 7. Integration Points

### 7.1 Integration with Leave Request Workflow (PRD 04)

**When Leave Request is Submitted:**
1. Calculate days for the request
2. Check if allowance is available (if `use_allowance = true`)
3. If insufficient allowance and negative not allowed, reject submission
4. If sufficient or negative allowed, mark allowance as "pending"

**When Leave Request is Approved:**
1. Move days from "pending" to "used"
2. Update allowance consumption
3. Trigger allowance recalculation

**When Leave Request is Rejected:**
1. Release "pending" allowance back to available
2. Update allowance display

**When Leave Request is Cancelled:**
1. If approved: return days to available allowance
2. If pending: release pending allowance
3. Update allowance consumption

### 7.2 Integration with User Management (PRD 01)

**When User is Created:**
1. Calculate initial pro-rated allowance based on start date
2. Create `user_allowance_adjustments` record if needed
3. Display allowance in user profile

**When User Start Date is Modified:**
1. Recalculate pro-rated allowance
2. Update allowance adjustments
3. Notify admin of change

**When User End Date is Set:**
1. Recalculate allowance for partial year
2. Prevent new leave requests beyond end date
3. Handle carry-over (none for leavers)

### 7.3 Integration with Company Structure (PRD 02)

**When Department Allowance is Changed:**
1. Recalculate allowances for all users in department
2. Notify affected users of change
3. Update allowance displays

**When User Changes Department:**
1. Recalculate allowance based on new department
2. Preserve existing adjustments and carry-over
3. Log department change in audit trail

**When Public Holiday is Added/Removed:**
1. Recalculate leave request days that overlap with holiday
2. Update allowance consumption
3. Notify affected users

### 7.4 Integration with Reporting (PRD 09)

**Allowance Reports:**
- Allowance summary by department
- Allowance usage trends over time
- Employees with negative allowance
- Carry-over analysis
- Adjustment audit report

---

## 8. Migration from v1

### 8.1 Data Migration

**Migrate `user_allowance_adjustment` table:**
- Map `UserId` → `user_id` (resolve UUID)
- Copy `year`, `adjustment`, `carried_over_allowance`
- Preserve `createdAt` → `created_at`

**Migrate user allowance fields:**
- v1 stores `adjustment` and `adjustmentCarriedOver` in Users table
- v2 stores in separate `user_allowance_adjustments` table
- Create adjustment records for each user with non-zero values

**Migrate department allowances:**
- Copy `allowance` from Departments table
- Copy `is_accrued_allowance` flag
- Verify allowance values are within valid range (0-365)

### 8.2 Calculation Verification

**Post-Migration Validation:**
1. For sample of users, calculate allowance in v1 and v2
2. Compare results - must match exactly
3. Verify pro-rating calculations
4. Verify carry-over calculations
5. Verify allowance consumption matches

**Test Cases:**
- New hire mid-year (pro-rating)
- Employee with carry-over
- Employee with manual adjustments
- Employee with negative allowance
- Accrued allowance mode
- Multiple leave types with limits

---

## 9. Testing Requirements

### 9.1 Unit Tests

**Allowance Calculation Tests:**
- ✅ Calculate base allowance from department
- ✅ Calculate base allowance from company default
- ✅ Pro-rate for mid-year hire
- ✅ Pro-rate for mid-year leaver
- ✅ Handle partial months correctly
- ✅ Calculate accrued allowance
- ✅ Apply manual adjustments
- ✅ Calculate carry-over
- ✅ Handle carry-over limits
- ✅ Calculate allowance consumption
- ✅ Handle half-day requests
- ✅ Exclude public holidays from calculations
- ✅ Respect working schedules

**Edge Case Tests:**
- ✅ Employee starts on first day of month
- ✅ Employee starts on last day of month
- ✅ Employee starts on 15th (boundary)
- ✅ Employee with zero base allowance
- ✅ Employee with negative adjustment exceeding base
- ✅ Carry-over with zero unused days
- ✅ Carry-over with unlimited setting
- ✅ Department change mid-year
- ✅ Leave request spanning year boundary

### 9.2 Integration Tests

**Workflow Integration:**
- ✅ Submit leave request → allowance marked pending
- ✅ Approve leave request → allowance marked used
- ✅ Reject leave request → allowance released
- ✅ Cancel approved leave → allowance restored
- ✅ Request exceeding allowance → blocked (if configured)
- ✅ Request with negative allowance allowed → succeeds

**User Management Integration:**
- ✅ Create user → allowance calculated
- ✅ Update start date → allowance recalculated
- ✅ Set end date → allowance adjusted
- ✅ Change department → allowance updated

**Year Transition:**
- ✅ Carry-over applied at year boundary
- ✅ Previous year allowance locked
- ✅ New year allowance calculated
- ✅ Expired carry-over removed

### 9.3 UI Tests

**Employee View:**
- ✅ Allowance widget displays correctly
- ✅ Breakdown shows all components
- ✅ History displays past years
- ✅ Warnings shown for low allowance
- ✅ Negative allowance displayed in red

**Admin View:**
- ✅ Can create manual adjustment
- ✅ Can view all users' allowances
- ✅ Bulk adjustment works correctly
- ✅ Allowance override functions
- ✅ Audit trail visible

**Supervisor View:**
- ✅ Team allowance dashboard loads
- ✅ Can view individual team member allowances
- ✅ Sorting and filtering work
- ✅ Calendar view shows team usage

---

## 10. Performance Requirements

### 10.1 Calculation Performance

**PR-6.1: Allowance Calculation Speed**
- Individual allowance calculation: < 100ms
- Batch calculation (100 users): < 5 seconds
- Real-time available allowance: < 50ms (cached)

**PR-6.2: Caching Strategy**
- Cache allowance calculations for current year
- Invalidate cache on:
  - Leave request status change
  - Manual adjustment
  - User/department data change
- Cache TTL: 5 minutes

### 10.2 Database Performance

**PR-6.3: Query Optimization**
- Index on `user_allowance_adjustments(user_id, year)`
- Index on `leave_requests(user_id, status, date_start, date_end)`
- Materialized view for team allowance summaries (optional)

**PR-6.4: Batch Operations**
- Bulk adjustments processed asynchronously for > 50 users
- Progress indicator for long-running operations
- Email notification on completion

---

## 11. Security Requirements

### 11.1 Access Control

**SR-6.1: Employee Access**
- Employees can view only their own allowance
- Cannot modify their own allowance
- Cannot view other employees' allowances (unless team view enabled)

**SR-6.2: Supervisor Access**
- Can view team members' allowances (read-only)
- Cannot modify team members' allowances
- Can view allowance when approving leave requests

**SR-6.3: Admin Access**
- Full access to all allowances
- Can create/modify adjustments
- Can override calculations
- All actions logged in audit trail

### 11.2 Data Validation

**SR-6.4: Input Validation**
- Adjustment amounts: -365 to +365 days
- Year: 2000 to 2100
- User must exist and be active
- Prevent duplicate adjustments (unique constraint)

**SR-6.5: Business Rule Validation**
- Validate allowance calculations before saving
- Prevent allowance manipulation via API
- Verify permissions before allowing adjustments

---

## 12. Accessibility Requirements

**AR-6.1: Screen Reader Support**
- Allowance breakdown announced clearly
- Color indicators supplemented with text
- Adjustment forms fully accessible

**AR-6.2: Keyboard Navigation**
- All allowance management functions keyboard accessible
- Tab order logical
- Focus indicators visible

**AR-6.3: Visual Clarity**
- High contrast for allowance status indicators
- Clear labels for all allowance components
- Tooltips for complex calculations

---

## 13. Localization Considerations

**LC-6.1: Number Formatting**
- Respect locale for decimal separators
- Display days with appropriate precision (e.g., "10.5 days" vs "10,5 days")

**LC-6.2: Date Formatting**
- Use company's configured date format
- Display dates in company's timezone

**LC-6.3: Terminology**
- "Allowance" vs "Entitlement" vs "Balance" (configurable)
- "Days in lieu" vs "Time off in lieu" (TOIL)

---

## 14. Future Enhancements (Out of Scope for v2.0)

**FE-6.1: Allowance Forecasting**
- Predict when employee will run out of allowance
- Suggest optimal leave distribution

**FE-6.2: Allowance Trading**
- Allow employees to donate/trade allowance days
- Requires approval workflow

**FE-6.3: Allowance Packages**
- Different allowance packages per role/seniority
- Automatic assignment based on user attributes

**FE-6.4: Allowance Notifications**
- Proactive notifications when allowance is low
- Reminders to use allowance before expiration

**FE-6.5: Advanced Accrual**
- Accrual based on hours worked
- Different accrual rates for different periods

---

## 15. Dependencies & References

### 15.1 Related PRDs

**Depends On:**
- **PRD 01**: User Management (user data, start/end dates)
- **PRD 02**: Company Structure (department allowances, public holidays, schedules)
- **PRD 03**: Leave Types (use_allowance flag, limits)

**Referenced By:**
- **PRD 04**: Leave Workflow (allowance validation, consumption)
- **PRD 09**: Reporting (allowance reports)
- **PRD 10**: Admin Functions (allowance management)

### 15.2 Database Schema

See **PRD 12** for complete schema:
- Section 2.2: Users table (`start_date`, `end_date`)
- Section 2.3: Departments table (`allowance`, `is_accrued_allowance`)
- Section 4.2: User Allowance Adjustments table
- Section 4.1: Leave Requests table (for consumption calculation)

### 15.3 Legacy Code References

**v1 Repository:**
- `models/user.js`: Allowance calculation methods
- `models/department.js`: Department allowance
- `lib/model/user_allowance.js`: Allowance logic
- `lib/model/leave.js`: Leave day calculation

---

## 16. Acceptance Criteria

### 16.1 Functional Acceptance

- ✅ **AC-6.1**: Base allowance correctly sourced from department or company
- ✅ **AC-6.2**: Pro-rating calculation matches v1 logic exactly
- ✅ **AC-6.3**: Manual adjustments can be created and are reflected immediately
- ✅ **AC-6.4**: Carry-over rules apply correctly at year boundary
- ✅ **AC-6.5**: Allowance consumption updates in real-time when leave status changes
- ✅ **AC-6.6**: Negative allowance handling works as configured
- ✅ **AC-6.7**: Accrued allowance mode calculates correctly
- ✅ **AC-6.8**: Leave type limits enforced independently of main allowance
- ✅ **AC-6.9**: Half-day requests deduct 0.5 days correctly
- ✅ **AC-6.10**: Public holidays excluded from leave day calculations

### 16.2 UI/UX Acceptance

- ✅ **AC-6.11**: Employee can view complete allowance breakdown
- ✅ **AC-6.12**: Allowance status indicators (colors) display correctly
- ✅ **AC-6.13**: Admin can create manual adjustments via UI
- ✅ **AC-6.14**: Supervisor can view team allowances
- ✅ **AC-6.15**: Allowance history shows all past years

### 16.3 Technical Acceptance

- ✅ **AC-6.16**: API endpoints return correct allowance data
- ✅ **AC-6.17**: Allowance calculations complete within performance targets
- ✅ **AC-6.18**: RLS policies prevent unauthorized access
- ✅ **AC-6.19**: Audit trail captures all allowance changes
- ✅ **AC-6.20**: Migration script successfully migrates v1 allowance data

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | PM Team | Initial draft based on v1 analysis and PRD 12 schema |

---

## Approval

This document requires approval from:
- [ ] Executive Sponsor
- [ ] Technical Lead
- [ ] Product Manager
- [ ] HR Stakeholder

---

*End of PRD 06 - Employee Allowance Management*
