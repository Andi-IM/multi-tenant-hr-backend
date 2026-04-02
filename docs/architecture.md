# Architecture & Design Documentation

## 1. System Architecture

This project follows a **Microservices Architecture** managed as a **Monorepo** using `pnpm` and `Turborepo`.

### Layered Architecture (Service Level)
Each microservice (e.g., `company-a`) implements a strict **Layered Architecture** to separate concerns:

1.  **Routes Layer**: Defines API endpoints and attaches middleware for authentication, authorization, and validation.
2.  **Controller Layer**: Orchestrates the request (Thin Controller), extracting data and handing off execution.
3.  **Service Layer**: Contains the core **Business Logic**. This is the primary location for business rules (e.g., check-in logic, leave validation).
4.  **Repository Layer**: Handles direct data access. It abstracts the database implementation and manages tenant context.

## 2. Multi-tenant Data Isolation Strategy

### Dynamic Database Switching (Logical Isolation)
Instead of a shared database with a `companyId` filter (which pose risks of data leakage), we implement **Logical Database Separation**.

-   **Mongoose `useDb()`**: The repository dynamically switches context using the `companyId` provided in the request context.
-   **Context Normalization**: Database names are generated as `tenant_<companyId>` (e.g., `tenant_CompanyA`).
-   **Security Boundaries**: Access is validated in two steps:
    1.  **Token Validation**: The JWT must contain a valid `companyId`.
    2.  **Service Authorization**: The service checks if it is authorized to handle that specifically requested `companyId` (REQ-DATA-001).

## 3. Authentication & Authorization

### Stateless Identity Management
-   **Authentication**: Uses JSON Web Token (JWT). The system is designed to be stateless, with user context injected from the token.
-   **RBAC (Role-Based Access Control)**: Separates roles (e.g., `Employee`, `Admin_HR`).
-   **Data Ownership Model**: Combines RBAC with ownership validation. For instance, an Admin from Company B is strictly forbidden from creating data for Company A (HTTP 403).

## 4. Indexing Strategy (ESR Guidelines)

We utilize the **ESR (Equality, Sort, Range)** guidelines for MongoDB to ensure query performance:

-   **Equality**: Filters like `employeeId` or `status`.
-   **Sort**: Sorting results (e.g., `date: -1`).
-   **Range**: Filtering by date ranges (e.g., `$gte: startDate`).
-   **Unique Constraints**: A unique index on `employeeId` ensures data integrity and supports idempotency.

## 5. Edge Case Handling

1.  **Idempotency**: CRUD operations and check-in/out events utilize database-level unique constraints (Mongoose E11000) to prevent duplicate data caused by network retries.
2.  **Timezone Strategy**: All timestamps should be stored in **UTC** in the database. Conversion to the employee's inherited timezone occurs during report aggregation or display.
3.  **Overlapping Leave**: Service-level validation ensures that new leave requests do not overlap with existing "Pending" or "Approved" records.

## 6. Technology Stack Rationale

### Transition from Prisma to Mongoose
Initially, the project used Prisma. We transitioned to **Mongoose** to fulfill the specific requirements of the technical test:

1.  **Dynamic Connection Management**: `useDb()` natively supports our multi-tenant "database-per-tenant" pattern more efficiently than Prisma.
2.  **Strict Schema Validation**: Mongoose provides robust application-level validation which is essential for enforcing data integrity before persistence.
3.  **Flexibility**: Easier management of compound indexes and complex aggregation pipelines for upcoming attendance reporting.

## 7. Architectural Trade-offs

### Consistency vs Availability (CAP Theorem)
-   **Challenge**: Validating employee data across services (e.g., Attendance calling Company Service) creates a dependency.
-   **Trade-off**: Using synchronous REST calls provides **Strong Consistency** but risks **Availability** if the target service is down.
-   **Mitigation**: Eventual consistency can be tolerated for non-critical lookups through caching (e.g., Redis) or an event-driven architecture to ensure High Availability during service interruptions.
