## Bank Holidays by country

### 1. Definitions

- **Employee country**: The country associated with an individual employee profile.
- **Company country**: The country configured in the Company’s General Settings.
- **Bank Holiday**: A non-working day associated with a specific country.
- **Pages affected**:
    - *Team View* page (calendar by employee)
    - *Calendar* page (individual user calendar)
    - *Bank Holiday* management page

---

### 2. Core Rules

1. Bank Holidays MUST be stored, managed, and retrieved **per country**.
2. Each Bank Holiday MUST be associated with exactly one country.
3. All calendar displays MUST resolve Bank Holidays based on the relevant country context (employee or company).

---

### 3. Team View Page Behavior

1. The Team View page MUST display Bank Holidays **per employee row**.
2. For each employee:
    - The calendar MUST show Bank Holidays associated with that employee’s country.
    - Bank Holidays from other countries MUST NOT be displayed in that employee’s row.
3. This behavior applies to all calendar views within the Team View page.

---

### 4. Individual Calendar Page Behavior

1. The calendar page for a logged-in user MUST display Bank Holidays associated with that user’s country.
2. Bank Holidays from other countries MUST NOT be shown.

---

### 5. Bank Holiday Management Page

1. A **country filter** MUST be available on the Bank Holiday page.
2. Default behavior:
    - When the page is first loaded, the displayed Bank Holiday list and calendar MUST correspond to the **Company country**.
3. Filtering behavior:
    - Users MUST be able to switch the view to any supported country.
    - When a country is selected, ONLY Bank Holidays for that country MUST be shown in both the list and calendar views.

---

### 6. Manual Management of Bank Holidays

1. The existing functionality for **manually adding, editing, or deleting Bank Holidays** MUST remain unchanged.
2. When manually creating or editing a Bank Holiday:
    - The associated country MUST be explicitly specified.
3. Deleting a Bank Holiday MUST only affect the selected country’s holiday data.

---

### 7. Example Scenario (Normative)

Given:

- Employee 1 (Marco): country = Italy
- Employee 2 (Manish): country = India
- Employee 3 (Arslan): country = Pakistan
- Company country = Italy

Expected behavior:

1. **Team View page**:
    - Marco’s row shows Italy Bank Holidays.
    - Manish’s row shows India Bank Holidays.
    - Arslan’s row shows Pakistan Bank Holidays.
2. **Bank Holiday page**:
    - By default, Italy Bank Holidays are displayed.
    - Selecting India shows only India Bank Holidays.
    - Selecting Pakistan shows only Pakistan Bank Holidays.