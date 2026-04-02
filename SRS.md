# **Software Requirements Specification (SRS)**

**Multi-Service Backend System for Attendance & Workforce Management**

## **1. Introduction**

### **1.1 Purpose**

This document specifies the requirements for a distributed *backend* system (consisting of three main services) that manages employee data, attendance, leave, and approval workflows. The main focus is on maintaining *service boundaries*, API security, cross-company data integrity, and performance efficiency under load.

### **1.2 Scope**

The system consists of three independent services:

1.  **Company A Service:** Manages employee *master* data for Company A in isolation.
2.  **Company B Service:** Manages employee *master* data for Company B in isolation.
3.  **Attendance Service:** A centralized service for recording attendance, submitting permits/leave, approval *workflow*, and reporting connected to their respective company services.

### **1.3 Glossary**

  * **Idempotency:** The ability of a system to handle the same request repeatedly without changing the final result beyond the first request (preventing duplication).
  * **RBAC:** *Role-Based Access Control*, a user-role-based authorization mechanism.
  * **IDOR:** *Insecure Direct Object Reference*, a security vulnerability where users can access objects/data they are not authorized to access.

## **2. Product Overview**

### **2.1 Context**

This system is designed for a holding company group that oversees multiple companies. Each subsidiary must maintain ownership and privacy of its employee data, but central management requires one integrated reporting and attendance system (Attendance Service).

### **2.2 Functions**

  * CRUD operations for employee data per company.
  * Validated *check-in/check-out* recording and derivation of attendance status (on-time, late, etc.).
  * Submission and approval (approve, reject, postpone) for leave and permits.
  * Generation of recapitulation reports for employee attendance and permits filtered by date range.

### **2.3 Constraints**

  * Strict multi-company separation (Company A employees must not leak into Company B data channels).
  * Technology stack is limited to Node.js, Express.js, and MongoDB.

### **2.4 Users**

  * **Employees:** Submit attendance, leave, and permits.
  * **Approvers / Administrators:** Approve/reject submissions and view reports.
  * **Service:** Internal services that communicate with each other (*service-to-service communication*).

### **2.5 Assumptions**

Specific business provisions such as late submission thresholds (*grace period* rules), tolerance for forgetting to *check-out*, and the impact of submission status/holidays are not rigidly defined by the central system and must be independently defined, documented, and implemented by the development team within their logic blocks.

## **3. Requirements**

### **3.1 External Interfaces**

  * **Software API:** All services must provide a structured REST API interface that returns appropriate HTTP status codes without leaking *error stack traces*.

### **3.2 Functional Requirements**

**REQ-FUNC-01: Employee Management (Company Services)**

  * Company services must provide APIs to Create, Update, Retrieve, List, and Deactivate employees.
  * Mandatory employee attributes include: ID, Full Name, Company Identifier, Date of Joining, Employment Status, Work Schedule, and Time Zone.

**REQ-FUNC-02: Centralized Identity Validation**

  * The Attendance Service is **prohibited** from storing employee *master* data. This service must validate employee identity and ownership directly through an *inter-service call* to the relevant Company Service.

**REQ-FUNC-03: Attendance Process (Attendance Service)**

  * The API must facilitate *check-in*, *check-out*, *timestamp* recording, attendance date, and automatic computation of attendance status (Present, Absent, Late).
  * The absence logic must distinguish between work days, non-work days, approved leave, and submissions that are still in *pending* status.

**REQ-FUNC-04: Permit and Leave Workflow (Attendance Service)**

  * Employees must be able to submit a date range for leave/permits.
  * The system must handle *overlapping* date conflicts, rejection of invalid date input, submissions from non-active employees, and repetitive actions on *approval actions*.

### **3.3 Quality of Service**

**REQ-QOS-01: Security & Authorization**

  * **Authentication:** All APIs (except public *endpoints* if any) must be validated with authentication.
  * **Authorization:** Implementation of RBAC separating Employee level actions, *Approver*/Admin level actions, and *Service-to-Service Trust Boundaries* authentication.
  * **Data Access Protection:** Prevention of IDOR, validation of *client-supplied roles*, and environment credential protection.

**REQ-QOS-02: Reliability & Data Integrity**

  * Implementation of anti-duplication and idempotency patterns for *check-in*, *check-out* operations, leave creation, and *approval* functions.
  * Strict validation against the entire *payload* structure, query/path parameters, date limits, enums, and data types.

**REQ-QOS-03: Performance & Efficiency**

  * The MongoDB database must be equipped with specific *indexing* strategies for employee searches, attendance data by date, permit periods, and approval status filters.
  * *Reporting* algorithms must minimize *database round trips* and not excessively burden service computation.

**REQ-QOS-04: Observability (Logging)**

  * Provision of adequate log recording for tracking authentication failures, approval actions, report generation processes, and inter-service communication *errors* without recording sensitive information (*PII*).

### **3.4 Design & Implementation Constraints**

  * **Code Structure:** Clean separation of *concerns*, manageable folder structure, use of *reusable* modules, and *clean service boundaries* within monorepo or multi-repository configurations.
  * **Configuration Management:** Credential information and *environment* values are prohibited from being *hardcoded*, and must use *environment variables*.

## **4. Verification**

  * **Load Testing:** Performance quality verification must be carried out on at least one critical *endpoint* (such as attendance recording or report *generation*). The output must include concurrency metrics, *bottleneck* detection, and test scenario analysis using standard instruments.
  * **Documentation Artifacts:** All *endpoints* must be documented (method, path, *payload*, *response*, *error*). Design *trade-off* decisions, service boundary strategies, DB *index* structure, leave computation algorithms, as well as handling of *edge-cases* and assumptions must be submitted in the form of a *Markdown* file (e.g., README.md).

## **5. Appendixes**

  * Public GitHub repository link containing all *source code*.
  * *Setup* Instructions (including installation, configuration, running services, and execution of *seed database* scripts).
  * *Load-test script* file.
