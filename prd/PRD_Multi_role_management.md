# PRD | Multi role management

Created by: Manuel Magnani
Created time: December 31, 2025 10:45 AM
Category: PRD
Last updated time: December 31, 2025 10:46 AM
LLM Chat: https://chatgpt.com/g/g-p-6954d8f877208191a04ecf486e8e8d96-prd-creation/c/6954efb5-7be4-832d-9721-a222428652a9
Projects: PTO Management System (https://www.notion.so/PTO-Management-System-2be69d035b198013bb7bedcaa482a4b9?pvs=21)

### 1. Core Concepts

1. **User Role (Default Role)**
    - Each user **MUST** have exactly one default role, referred to as the *User Role*.
    - The User Role applies globally across the system unless explicitly overridden at the project level.
2. **Project Role**
    - A user **MAY** have zero or one Project Role per project they are assigned to.
    - A Project Role is defined only within the context of a specific project.
    - A user **MAY** have different Project Roles across different projects.

---

### 2. Role Resolution Rules

1. **Role Applicability**
    - When a user performs an action (e.g., submits a leave request), the system **MUST** identify:
        - The user’s default User Role.
        - Any Project Role associated with the project context of the action (if applicable).
2. **Fallback Logic**
    - If no Project Role is defined for the relevant project, the system **MUST** use the User Role for that project context.

---

### 3. Workflow Execution Rules

1. **Multi-Role Workflow Evaluation**
    - When a workflow is triggered, the system **MUST** evaluate workflow rules for **all applicable roles**, including:
        - The User Role.
        - Each relevant Project Role.
2. **Approval Routing**
    - The workflow **MUST** generate approval requests for each role-based rule independently.
    - Approval requests **MUST NOT** override or replace one another unless explicitly defined by workflow configuration.

---

### 4. Example (Normative)

1. **Example Scenario**
    - User Role: `CTO`
    - Project Role: `Tech Lead` in `Project A`
    
    **Behavior:**
    
    - When the user submits a leave request:
        - The system evaluates rules for the `CTO` role and routes approval to the `CEO`.
        - The system evaluates rules for the `Tech Lead` role in `Project A` and routes approval to the `Project A PM`.
    - Both approval requests are required unless workflow rules explicitly state otherwise.

---

### 5. Validation Criteria

1. **Consistency and Completeness**
    - Every user action **MUST** be processed using a deterministic role resolution process.
    - No workflow behavior **MAY** depend on implicit assumptions about roles.
    - All roles influencing a workflow **MUST** be explicitly evaluated and logged.

---