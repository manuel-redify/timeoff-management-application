# PRD | PTO email approval workflow

Created by: Manuel Magnani
Created time: December 31, 2025 9:20 AM
Category: PRD
Last updated time: December 31, 2025 9:23 AM
LLM Chat: https://chatgpt.com/g/g-p-6954d8f877208191a04ecf486e8e8d96-prd-creation/c/6954db4a-10d4-8333-b0ce-fb1937bb67a1
Projects: PTO Management System (https://www.notion.so/PTO-Management-System-2be69d035b198013bb7bedcaa482a4b9?pvs=21)

### 1. Objective

Enable PTO (Paid Time Off) approvers to approve or reject leave requests directly from email notifications, without logging into the platform, while ensuring security, traceability, and clarity of outcomes.

---

### 2. Scope

- Applies to **all PTO / leave request types**.
- Covers the **approval and rejection** actions triggered from email notifications.
- Excludes changes to PTO request creation and internal approval logic.

---

### 3. Actors

- **Approver**: User authorized to approve or reject PTO requests.
- **System**: Time-off management platform handling PTO requests, emails, and approvals.

---

### 4. As-Is Behavior (Current State)

- When a new PTO request is submitted:
    - The approver receives an email notification.
    - The email contains no actionable controls.
- To take action, the approver must:
    - Log in to the time-off management platform.
    - Manually approve or reject the request.
- If rejecting:
    - No rejection reason can currently be specified.

---

### 5. To-Be Behavior (New Feature)

### 5.1 Email Notification

- For each new PTO request, the system sends an email to the approver.
- The email **must include exactly two Call-To-Action (CTA) buttons**:
    1. **Approve**
    2. **Reject**

---

### 5.2 Approve Flow

- When the approver clicks **Approve**:
    - The system opens a web page in the browser.
    - The system automatically identifies and authenticates the approver (no login required).
    - The PTO request is immediately marked as **Approved**.
    - The web page displays a clear confirmation message:
        - Approval was successfully submitted.
        - No further actions are required.
- The approver cannot modify request details during this flow.

---

### 5.3 Reject Flow

- When the approver clicks **Reject**:
    - The system opens a web page in the browser.
    - The system automatically identifies and authenticates the approver (no login required).
    - The web page displays a rejection form containing:
        - A **mandatory text field** for the rejection reason.
- Upon form submission:
    - The PTO request is marked as **Rejected**.
    - The rejection reason is stored and associated with the request.
    - The web page displays a clear confirmation message:
        - Rejection was successfully submitted.
        - No further actions are required.

---

### 6. Authentication & Security Requirements

- The approver must be automatically recognized using a **secure, single-use or time-limited token** embedded in the email CTA link.
- No manual login (username/password) is required for either flow.
- The solution must support:
    - Different browsers
    - Different devices
- Tokens must:
    - Be uniquely associated with the PTO request and approver.
    - Become invalid after successful approval/rejection or after expiration.

---

### 7. Validation & Constraints

- An approver can complete **only one action** (approve or reject) per PTO request.
- If the PTO request has already been processed:
    - The system must display an informative message indicating no further action is possible.
- Rejection cannot be submitted without a rejection reason.
- The system must log:
    - Approver identity
    - Action taken (approve/reject)
    - Timestamp
    - Rejection reason (if applicable)

---

### 8. Non-Functional Requirements

- The approval/rejection confirmation pages must load in under acceptable performance thresholds.
- The user experience must be simple, minimal, and optimized for fast decision-making.
- The feature must not degrade existing approval workflows within the platform.

---