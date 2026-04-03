This document outlines the business rules for the application.

# 1. Multi-Company Isolation Rule

This rule ensures no data leak between companies.

> - **Logical Database Separation**: CompanyA employees are managed exclusively by the `Company A Service` and stored in its respective database. The `Company B Service` has no access, authorization, or network connection to Company A's data paths.
> - **Cross-Company Access Denied**: If there is a request from an Admin or entity affiliated with CompanyB (identified via token) to access the `Company A Service`, the system will automatically reject the request with an `HTTP 403 Forbidden` response.

# 2. Attendance Logic

This rule defines how attendance status is derived within the Attendance Service.

> - **External Identity Validation**: The `Attendance Service` must not act as the source of truth for employee master data. Before recording attendance, the `Attendance Service` **must** make a synchronous internal API call to the relevant `Company Service` to validate the employee.
>   - If the `Company Service` returns an inactive employee status, the attendance submission is rejected with a `HTTP 403 Forbidden` response.
> - **Status Determination (On-Time/Late)**: The system compares the current check-in timestamp with the `shiftStart` parameter in the `workSchedule` object.
>   - The grace period is configurable via environment variable (default: 15 minutes).
>   - If the check-in time is $\le$ (shiftStart + gracePeriod), the status is "On-Time".
>   - If the check-in time is $>$ (shiftStart + gracePeriod), the status is "Late".
> - **Missing Check-out (Incomplete)**: If there is no check-out record by the end of the day (23:59:59 based on the employee's timezone), the system marks the attendance status as **"Incomplete"**. The effective working hours may be reduced due to this status.

# 3. Leave and Permission Logic

This governs the creation and approval workflows for absences.

> - **RBAC Authorization**:
>   - **Employee Role**: Can submit leave/permission requests, view own requests and status.
>   - **Approver/Admin Role**: Can view all requests, approve/reject/postpone requests.
>   - The system verifies the user's role from the token before allowing approval actions.
> - **Overlapping Dates**: The system rejects the request with a `400 Bad Request` ("Dates already requested") if an employee submits a `startDate` and `endDate` range that overlaps with another request document currently in a **Pending** or **Approved state**.
> - **Invalid Date Input**:
>   - `startDate` must not be in the past.
>   - `endDate` must be greater than or equal to `startDate`.
>   - System rejects invalid date input with `400 Bad Request`.
> - **Employee Status Validation**: Before processing a leave request, the system validates the employee's status via inter-service call to the relevant `Company Service`.
>   - If the employee is inactive, the request is rejected with `HTTP 403 Forbidden`.
> - **Default Status**: Every newly and successfully saved leave or permission request always has an initial state of **Pending**.
> - **Approval Authorization**: The action of changing a status to **Approved**, **Rejected**, or **Postponed** requires the system to verify the user's role as an authorized Approver/Admin.
> - **Approval Statuses**:
>   - **Pending**: Initial state after submission.
>   - **Approved**: Request accepted by Approver/Admin.
>   - **Rejected**: Request denied by Approver/Admin.
>   - **Postponed**: Request deferred for additional review or information.

# 4. Idempotency and Duplicate Request Handling

This prevents duplicate requests caused by network failures or accidental resubmission.

> - **Check-in Idempotency**: If the system receives a check-in request on the same date for the same `employeeId`, the system will safely handle the duplicate submission and will not create a new record. It will return `200 OK` HTTP status (as if successful) to maintain data integrity.
> - **Leave Request Idempotency**: If the system receives a duplicate leave request (same employeeId, same startDate, same endDate, same type) within a short time window, the system will return `200 OK` without creating a duplicate record.
> - **Approval Idempotency**: If an _Approver_ attempts to approve, reject, or postpone a document that is _already_ in an **Approved**, **Rejected**, or **Postponed** state, the system will safely handle the execution without causing a system error (returning HTTP 200/204 or an informative message) and will not corrupt historical data.

# 5. Absence Logic

This is used when `Attendance Service` generates reports.

> - **Absence Conditions**: Normal working days are determined from the working days array (e.g., ["Monday", "Tuesday", ...]). A day is considered "Absent" if and only if it simultaneously meets all the following conditions:
>   1. The day is included in the working days (`workingDays`).
>   2. The day is not a non-working day or holiday.
>   3. There is **NO** check-in record for that employee on that day.
>   4. There is **NO** Leave or Permission request with an Approved status covering that date.

# 6. Security and Authorization

> - **Authentication**: All APIs (except public endpoints if any) must be validated with authentication via token verification.
> - **RBAC Implementation**:
>   - **Employee**: Can perform check-in/check-out, submit leave/permission requests, view own attendance and requests.
>   - **Approver/Admin**: Can approve/reject/postpone requests, view all employees' attendance and requests, generate reports.
> - **IDOR Prevention**: All resource access must validate ownership or appropriate role before returning data.
> - **Service-to-Service Trust**: Internal service calls use dedicated service credentials or shared secrets for authentication.
