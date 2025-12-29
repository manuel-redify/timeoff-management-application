# Product Requirements Document (PRD)

## Feature: Flexible Leave Approval Workflow

---

## 1. Purpose

This document describes the requirements for implementing a **flexible, role-based leave approval workflow** within an existing web application. The PRD is intended to be provided to a **Large Language Model (LLM)** or engineering team to design and implement the feature with minimal ambiguity.

The goal is to replace the current **department-based approval logic** with a **configurable, scalable, and future-proof system** that reflects the organization’s real structure.

---

## 2. Background & Problem Statement

### Current State
- Leave requests are approved solely based on **department**.
- Each user has a single department manager.
- Approval logic is hard-coded and inflexible.

### Problems
- The organization has **multiple hierarchies and reporting lines**.
- Project teams have:
  - A **PM** as overall responsible
  - **Tech Leads** responsible for developers **by technical area** (FE, BE, DevOps, QA, etc.)
- Developers often report to **both** a PM and a Tech Lead.
- Users may belong to **multiple teams or areas**.
- The current model cannot support:
  - Multiple approvers
  - Area-specific Tech Leads
  - Parallel vs sequential approvals

---

## 3. Goals & Non-Goals

### Goals
- Support **multiple approvers** per leave request
- Support **parallel and sequential** approval flows
- Ensure **Tech Leads are matched by technical area**
- Allow users to belong to **multiple roles, areas, and teams**
- Keep the system **simple to configure** (no BPM engine)
- Be extensible to future workflows (but only leave requests are in scope now)

### Non-Goals
- Implement other workflows (expenses, travel, etc.)
- Implement payroll or HR policy logic
- Implement complex conditional branching (e.g. dynamic skipping rules)

---

## 4. Scope

### In Scope
- Leave request approval workflow
- Organizational modeling (roles, areas, teams)
- Approval rule configuration
- Parallel and sequential approval handling

### Out of Scope
- UI/UX polish (basic admin UI only)
- Mobile-specific behavior
- Localization

---

## 5. Organizational Model

### 5.1 Users

- A user represents a person in the organization.
- A user has a **contract type**:
  - `Employee`
  - `Contractor`
- A user can have:
  - Multiple roles
  - Multiple technical areas
  - Membership in multiple teams
  - Membership in multiple projects (of different project types)

**Contract Type Behavior**:
- `Employee`: standard leave approval workflow applies.
- `Contractor`:
  - Leave requests are **auto-approved by default**.
  - Requests act as a **communication/information event**, not a blocking approval process.
  - Approval rules are skipped, but notifications (approvers and watchers) are still sent.

---


### 5.2 Roles

Roles define **responsibilities**, not hierarchy.

Examples:
- CEO
- COO
- CTO
- CPO
- PM (Project Manager)
- Tech Lead
- Developer
- Marketing Manager
- Accountant

---

### 5.3 Technical Areas

Technical areas are used to **match developers with the correct Tech Lead**.

Examples:
- Front-End
- Back-End
- CMS
- DevOps
- QA

---

### 5.4 Teams / Groups

Teams represent **organizational or project groupings**.

Examples:
- Project Team Alpha
- Project Team Beta
- Marketing
- Accounting

Users may belong to multiple teams.

---

## 6. Core Concepts: Projects, Approval Rules, and Watchers

### 6.1 Project Types

Each project has a **Project Type** that affects leave approval behavior.

Supported values:
- `Project`
- `Staff Augmentation`

**Project Type Behavior**:

| Project Type | Behavior |
|-------------|----------|
| Project | Full approval workflow applies (Tech Lead + PM) |
| Staff Augmentation | Tech Lead and area-based rules are ignored; all users report directly to the PM |

Users may belong to **multiple projects of different types** simultaneously. The project context for a leave request must be explicitly resolved.

---

### 6.2 Approval Rules

Approval logic must be **data-driven**, not hard-coded.

An **Approval Rule** defines:
- Who is requesting
- Who must approve
- In which project context
- In which order (if any)

---

Approval logic must be **data-driven**, not hard-coded.

An **Approval Rule** defines:
- Who is requesting
- Who must approve
- In which context
- In which order (if any)

---

## 7. Functional Requirements

### 7.1 Leave Request

- A user can submit a leave request.
- A leave request triggers one or more approval steps.
- Approval steps are resolved dynamically at request time.

---

### 7.2 Approval Rule Definition

Each approval rule MUST support the following attributes:

| Attribute | Description |
|--------|------------|
| request_type | Always `LEAVE` for now |
| project_type | `Project` or `Staff Augmentation` |
| subject_role | Role of the requester (e.g. Developer) |
| subject_area | Area of the requester (optional) |
| approver_role | Role of the approver (e.g. Tech Lead, PM) |
| approver_area | Area constraint (`SAME_AS_SUBJECT` or `NULL`) |
| team_scope | Whether approver must belong to the same team/project |
| sequence_order | Integer for sequential approval, NULL for parallel |

**Special Rules**:
- For `Staff Augmentation` projects, only rules with `approver_role = PM` are evaluated.
- Tech Lead–based rules are ignored for `Staff Augmentation` projects.

--------|------------|
| request_type | Always `LEAVE` for now |
| subject_role | Role of the requester (e.g. Developer) |
| subject_area | Area of the requester (optional) |
| approver_role | Role of the approver (e.g. Tech Lead, PM) |
| approver_area | Area constraint (e.g. SAME_AS_SUBJECT or NULL) |
| team_scope | Team context (e.g. same project team) |
| sequence_order | Integer for sequential approval, NULL for parallel |

---

### 7.3 Area Matching Rules

- If `approver_area = SAME_AS_SUBJECT`:
  - The approver must have the same technical area as the requester.
- If `approver_area = NULL`:
  - Area is ignored (used for PMs, executives).

---

### 7.4 Parallel vs Sequential Approvals

- `sequence_order = NULL`
  - Approval is parallel with other NULL-order rules.
- `sequence_order = 1, 2, 3...`
  - Approval must occur in ascending order.

---

### 7.5 Example Approval Flows

#### Employee – Developer (Front-End) – Project
1. Tech Lead (Front-End) – sequence_order = 1
2. PM – sequence_order = 2

#### Employee – Developer (Back-End) – Project
1. Tech Lead (Back-End)
2. PM

#### Employee – Any Role – Staff Augmentation Project
1. PM only

#### Contractor – Any Role – Any Project Type
- Request is auto-approved
- PM and watchers are notified

---

## 8. Approval Resolution Logic

When a leave request is submitted:

1. Identify requester:
   - Roles
   - Areas
   - Teams

2. Retrieve all Approval Rules where:
   - request_type matches
   - subject_role matches requester role
   - subject_area matches or is NULL

3. For each rule:
   - Resolve candidate approvers by:
     - Role match
     - Area constraint
     - Team membership

4. Generate approval steps:
   - Group by `sequence_order`
   - Parallel approvals share the same step

5. Persist approval steps for the request.

---

## 9. Data Model (Logical)

### User
- id
- name
- contract_type (`Employee` | `Contractor`)

### Role
- id
- name

### Area
- id
- name

### Team
- id
- name

### Project
- id
- name
- project_type (`Project` | `Staff Augmentation`)

### UserRoleArea
- user_id
- role_id
- area_id (nullable)

### UserTeam
- user_id
- team_id

### UserProject
- user_id
- project_id

### ApprovalRule
- id
- request_type
- project_type
- subject_role_id
- subject_area_id (nullable)
- approver_role_id
- approver_area_constraint (NULL | SAME_AS_SUBJECT)
- team_scope_required (boolean)
- sequence_order (nullable)

### WatcherRule
- id
- request_type
- project_type
- role_id (nullable)
- team_id (nullable)
- project_id (nullable)

---

## 10. Permissions, Watchers & Edge Cases

### Permissions
- Only resolved approvers can approve or reject.
- Users cannot approve their own requests.

---

### Watchers

**Definition**:
- Watchers are users who are **not approvers**.
- They are notified of leave request events but take no action.

**Notification Events**:
- Leave request creation
- Final outcome (approved / rejected / auto-approved)
- Cancellation by requester

**Watcher Assignment**:
- Watchers can be defined via:
  - Rules (role/team/project-based)
  - Direct assignment to a project or team

Watchers do **not** block or influence approval flow.

---

### Edge Cases
- Multiple Tech Leads in the same area → all must approve (parallel).
- Missing approver → request is blocked and flagged as configuration error (except Contractors).
- Contractor requests are always auto-approved, regardless of project type.
- User with multiple roles → highest-priority role is used (priority rules TBD).

---

## 11. Admin Configuration Requirements

Admins must be able to:
- Create/edit roles
- Create/edit areas
- Assign users to roles + areas
- Create/edit teams
- Assign users to teams
- Define and reorder approval rules

Validation rules:
- Prevent circular approvals
- Warn if no approver can be resolved

---

## 12. Success Criteria

- Leave requests follow correct approvers based on role and area
- Tech Leads only approve developers in their own area
- Approval order can be switched from parallel to sequential without code changes
- Organizational changes require configuration only

---

## 13. Future Extensions (Not in Scope)

- Approval delegation
- Temporary substitutes
- Multi-request-type workflows
- Conditional branching (e.g. long leave)

---

## 14. Open Questions (Explicitly Deferred)

- Role priority resolution when a user has multiple subject roles
- Escalation rules on timeout
- Notification strategy

---

**End of PRD**

