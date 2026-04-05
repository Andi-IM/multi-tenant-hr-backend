This document outlines the business rules for the application.

> **📋 Dokumen ini adalah turunan/implementasi dari SDD.md.**
> Semua aturan bisnis harus dapat ditelusuri ke elemen desain di SDD.
> Jika ada ketidaksesuaian, **SDD.md yang menjadi acuan utama**.

---

# 1. Multi-Company Isolation Rule

> **SDD Ref:** [CMP-001](./sdd.md#cmp-001-composition-view--service-decomposition), [DEC-003](./sdd.md#dec-003---isolated-mongodb-database-per-service), [INF-001](./sdd.md#inf-001-information-view--data-schema--persistence)

This rule ensures no data leak between companies.

> - **Logical Database Separation**: CompanyA employees are managed exclusively by the `Company A Service` and stored in its respective database. The `Company B Service` has no access, authorization, or network connection to Company A's data paths.
> - **Cross-Company Access Denied**: If there is a request from an Admin or entity affiliated with CompanyB (identified via token) to access the `Company A Service`, the system will automatically reject the request with an `HTTP 403 Forbidden` response.

# 2. Attendance Logic

> **SDD Ref:** [ALG-001](./sdd.md#alg-001-algorithm-view---attendance-status-derivation), [INT-001](./sdd.md#int-001-interaction-view---check-in-flow), [DEC-001](./sdd.md#dec-001---synchronous-rest-for-inter-service-communication), [SEC-001](./sdd.md#sec-001-interface-view---authentication--authorization-design)

This rule defines how attendance status is derived within the Attendance Service.

> - **External Identity Validation**: The `Attendance Service` must not act as the source of truth for employee master data. Before recording attendance, the `Attendance Service` **must** make a synchronous internal API call to the relevant `Company Service` to validate the employee.
>   - If the `Company Service` returns an inactive employee status, the attendance submission is rejected with a `HTTP 403 Forbidden` response.
> - **Status Determination (on-time/late)**: The system compares the current check-in timestamp with the `startTime` parameter in the `workSchedule` object (ALG-001).
>   - The grace period is defined per-employee via `workSchedule.toleranceMinutes`.
>   - If the check-in time is $\le$ (startTime + toleranceMinutes), the status is `on-time`.
>   - If the check-in time is $>$ (startTime + toleranceMinutes), the status is `late`.
> - **Missing Check-out**: If there is no check-out record by the end of the day, the system records `checkOutTime` as `null`. Reports will display this as "tidak tercatat". Historical data is never modified retroactively.

# 3. Leave and Permission Logic

> **SDD Ref:** [STT-001](./sdd.md#stt-001-state-dynamics-view---leavepermission-request-state-machine), [INT-002](./sdd.md#int-002-interaction-view---leavepermission-approval-flow), [SEC-001](./sdd.md#sec-001-interface-view---authentication--authorization-design), [ALG-002](./sdd.md#alg-002-algorithm-view---report-aggregation)

This governs the creation and approval workflows for absences.

> - **RBAC Authorization**:
>   - **Employee Role**: Can submit leave/permission requests, view own requests and status.
>   - **Approver/Admin Role**: Can view all requests, approve/reject requests.
>   - The system verifies the user's role from the token before allowing approval actions.
> - **Overlapping Dates**: The system rejects the request with a `400 Bad Request` ("Dates already requested") if an employee submits a `startDate` and `endDate` range that overlaps with another request document currently in an **approved** state.
> - **Invalid Date Input**:
>   - `startDate` must not be in the past.
>   - `endDate` must be greater than or equal to `startDate`.
>   - System rejects invalid date input with `400 Bad Request`.
> - **Employee Status Validation**: Before processing a leave request, the system validates the employee's status via inter-service call to the relevant `Company Service`.
>   - If the employee is inactive, the request is rejected with `HTTP 403 Forbidden`.
> - **Default Status**: Every newly and successfully saved leave or permission request always has an initial state of **Pending**.
> - **Approval Authorization**: The action of changing a status to **approved** or **rejected** requires the system to verify the user's role as an authorized Approver/Admin.
>   - **pending**: Initial state after submission.
>   - **approved**: Request accepted by Approver/Admin.
>   - **rejected**: Request denied by Approver/Admin.

# 4. Idempotency and Duplicate Request Handling

> **SDD Ref:** [REQ-QOS-03](./sdd.md#req-qos-03), [Appendix 5.3 Edge Case Handling](./sdd.md#53-edge-case-handling)

This prevents duplicate requests caused by network failures or accidental resubmission.

> - **Check-in Idempotency**: If the system receives a check-in request on the same date for the same `employeeId`, the system will safely handle the duplicate submission and will not create a new record. It will return `200 OK` HTTP status (as if successful) to maintain data integrity.
> - **Leave Request Idempotency**: If the system receives a duplicate leave request (same employeeId, same startDate, same endDate, same type) within a short time window, the system will return `200 OK` without creating a duplicate record.
> - **Approval Idempotency**: If an _Approver_ attempts to approve or reject a document that is _already_ in an **approved** or **rejected** state, the system will reject the request with `409 Conflict` (STT-001) to ensure state transitions are one-way and intentional.

# 5. Absence Logic

> **SDD Ref:** [ALG-002](./sdd.md#alg-002-algorithm-view---report-aggregation), [INF-001](./sdd.md#inf-001-information-view--data-schema--persistence)

This is used when `Attendance Service` generates reports.

>   - **Absence Conditions**: Normal working days are determined from the `workDays` array. A day is considered `absent` if and only if it simultaneously meets all the following conditions:
>   1. The day is included in the `workDays`.
>   2. The day is not a non-working day or holiday.
>   3. There is **NO** check-in record for that employee on that day.
>   4. There is **NO** Leave or Permission request with an `approved` status covering that date.

# 6. Security and Authorization

> **SDD Ref:** [SEC-001](./sdd.md#sec-001-interface-view---authentication--authorization-design), [REQ-QOS-01](./sdd.md#req-qos-01-security-and-data-protection), [REQ-QOS-02](./sdd.md#req-qos-02-inter-service-trust-boundaries)

> - **Authentication**: All APIs (except public endpoints if any) must be validated with authentication via token verification.
> - **RBAC Implementation**:
>   - **Employee**: Can perform check-in/check-out, submit leave/permission requests, view own attendance and requests.
>   - **Approver/Admin**: Can approve/reject requests, view all employees' attendance and requests, generate reports.
> - **IDOR Prevention**: All resource access must validate ownership or appropriate role before returning data.
> - **Service-to-Service Trust**: Internal service calls use dedicated service credentials or shared secrets for authentication.
