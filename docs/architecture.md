# Architecture & Design Documentation

## 1. System Architecture

This project follows a **Microservices Architecture** managed as a **Monorepo** using `pnpm` and `Turborepo`.

### Layered Architecture (Service Level)

Each microservice (e.g., `company-service`) implements a strict **Layered Architecture** to separate concerns:

1.  **Routes Layer**: Defines API endpoints and attaches middleware for authentication, authorization, and validation.
2.  **Controller Layer**: Orchestrates the request (Thin Controller), extracting data and handing off execution.
3.  **Service Layer**: Contains the core **Business Logic**. This is the primary location for business rules (e.g., check-in logic, leave validation).
4.  **Repository Layer**: Handles direct data access. It abstracts the database implementation and manages tenant context.

## 2. Multi-tenant Data Isolation Strategy

### Dynamic Database Switching (Logical Isolation)

Instead of a shared database with a `companyId` filter (which pose risks of data leakage), we implement **Logical Database Separation**.

- **Mongoose `useDb()`**: The repository dynamically switches context using the `companyId` provided in the request context.
- **Context Normalization**: Database names are generated as `tenant_<companyId>` (e.g., `tenant_CompanyA`).
- **Security Boundaries**: Access is validated in two steps:
  1.  **Token Validation**: The JWT must contain a valid `companyId`.
  2.  **Service Authorization**: The service checks if it is authorized to handle that specifically requested `companyId` (REQ-DATA-001).

## 3. Authentication & Authorization

### Stateless Identity Management

- **Authentication**: Uses JSON Web Token (JWT). The system is designed to be stateless, with user context injected from the token.
- **RBAC (Role-Based Access Control)**: Separates roles (e.g., `Employee`, `Admin_HR`).
- **Data Ownership Model**: Combines RBAC with ownership validation. For instance, an Admin from Company B is strictly forbidden from creating data for Company A (HTTP 403).

## 4. Indexing Strategy (ESR Guidelines)

We utilize the **ESR (Equality, Sort, Range)** guidelines for MongoDB to ensure query performance:

- **Equality**: Filters like `employeeId` or `status`.
- **Sort**: Sorting results (e.g., `date: -1`).
- **Range**: Filtering by date ranges (e.g., `$gte: startDate`).
- **Unique Constraints**: A unique index on `employeeId` ensures data integrity and supports idempotency.

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

- **Challenge**: Validating employee data across services (e.g., Attendance calling Company Service) creates a dependency.
- **Trade-off**: Using synchronous REST calls provides **Strong Consistency** but risks **Availability** if the target service is down.
- **Mitigation**: Eventual consistency can be tolerated for non-critical lookups through caching (e.g., Redis) or an event-driven architecture to ensure High Availability during service interruptions.

## 8. Containerization & Deployment Strategy

To simplify the architecture and minimize build overhead, we utilize a **Shared Container Image** strategy for identical business services.

### Single Image, Multiple Tenants

Since the business logic for all Company Services (`company-a` and `company-b`) is identical as requested by SRS, deploying separate codebases is redundant.
Instead, we:

1. **Build a single Docker image** (`hr-company-api`) originating from the `company-service` source code using a multi-stage `turbo prune` process.
2. **Run multiple containers** from this shared image via Docker Compose.
3. **Differentiate tenant behavior** purely through environment variables mapping:
   - Container A: `COMPANY_ID=A`, `DATABASE_URL=...company_a_db`
   - Container B: `COMPANY_ID=B`, `DATABASE_URL=...company_b_db`

### Benefits

- **Zero Code Duplication**: Eliminated the redundant `services/company-b` folder.
- **Faster Build Times**: Turborepo only builds the API once.
- **Improved Maintainability**: Bug fixes and features written for the core application immediately apply to all tenant containers without synchronization overhead.

### Future-Proofing: Handling Tenant Divergence

In accordance with the flexibility expected in the SRS, it is possible that business rules for individual companies will slowly diverge in the future. We will handle this using a tiered strategy:

1. **Low Divergence (Feature Flags)**: Differences in simple thresholds or on/off features will be handled via tenant configuration (Environment Variables or DB Config table).
2. **Medium Divergence (Strategy Pattern)**: Differences in processing logic (e.g., different payroll formulas) will be handled via the Strategy Pattern injected at runtime based on the `COMPANY_ID` context.
3. **High Divergence (Service Forking)**: If a company's data model and entire business flow change fundamentally, we will fork `services/company-service` into a standalone bounded context (e.g., `services/company-b-custom`) and deploy it as a separate independent image within the monorepo structure. This guarantees the architecture remains robust without creating unmaintainable "spaghetti code."

## 9. Database Topology: Logical vs Physical Isolation

A common misconception of the "Database per Service" microservice principle is that each service requires its own dedicated database **server**. In practice, the principle refers to **logical isolation** (separate databases), not necessarily **physical isolation** (separate instances).

### Current Architecture: Single Instance, Multiple Databases

We deploy a single MongoDB instance (Replica Set) that hosts multiple logically separated databases:

- `company_a_db` — owned exclusively by the Company A container.
- `company_b_db` — owned exclusively by the Company B container.
- `attendance_db` — owned exclusively by the Attendance service.

Each service connects only to its designated database via the `DATABASE_URL` environment variable. Cross-service data access is strictly prohibited at the database level and is enforced through inter-service REST API calls (REQ-FUNC-02).

### Why This Is Sufficient

1. **Data Ownership Is Enforced**: No service can query another service's database. The Attendance service validates employee identity through an API call to the Company service, never by directly reading `company_a_db`.
2. **Resource Efficiency**: Running separate MongoDB instances for each service would triple memory, CPU, and storage overhead without proportional benefit at the current scale.
3. **Operational Simplicity**: A single Replica Set is easier to monitor, backup, and maintain than three independent clusters.

### When to Consider Physical Separation

Physical database separation (dedicated instances per service) becomes justified when:

- **Divergent scaling requirements**: e.g., Attendance handles 10,000 writes/sec while Company handles 10 reads/sec.
- **Regulatory/compliance mandates**: e.g., financial data must be physically isolated from HR data.
- **Fault isolation requirements**: e.g., an Attendance DB crash must not affect the Company service's availability.
- **Different storage engines or configurations**: e.g., one service needs time-series collections while another needs sharding.

Until these conditions arise, the current topology follows the **YAGNI (You Aren't Gonna Need It)** principle — avoiding premature complexity while maintaining clean service boundaries.

## 10. Testing Strategy

To ensure high reliability and to maintain the independent testability of our microservices, we employ a sophisticated multi-tiered testing strategy:

### 10.1. Contract Testing (Pact)

- **Challenge**: The Attendance Service relies heavily on the Company Service for employee validation, relying on synchronous cross-service APIs. Traditional End-to-End (E2E) tests for these interactions require complex, brittle environments (standing up both services and their databases).
- **Solution**: We implemented **Consumer-Driven Contract Testing** using **Pact**.
  - The Attendance Service (Consumer) defines expected HTTP interactions and boundaries in isolation, which generates a _Pact JSON contract_.
  - The Company Service (Provider) verifies its actual API responses against this generated contract during its independent CI pipeline.
  - This eliminates brittle E2E paths, providing integration safety while allowing both services to evolve and be tested rapidly in isolation.

### 10.2. "No-Domino-Effect" Unit & Integration Testing

- We enforce strict isolation in behavior-driven unit testing (via Vitest/Jest). The standard approach separates the architecture into verifiable segments without overlapping: Controllers mock Services, and Services mock Repositories.
- Supported by Codecov inside GitHub Actions, checking for coverage targets on every commit. This ensures stable production code while preventing localized failures from cascading through test suites.
