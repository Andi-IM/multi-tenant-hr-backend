# Architecture & Design Documentation

> **📋 Dokumen ini adalah turunan/implementasi dari SDD.md.**
> Semua keputusan arsitektur dan teknis harus dapat ditelusuri ke elemen desain di SDD.
> Jika ada ketidaksesuaian, **SDD.md yang menjadi acuan utama**.

## 1. System Architecture

> **SDD Ref:** [CMP-002](./sdd.md#cmp-002-composition-view---layered-architecture-per-service), [DEC-004](./sdd.md#dec-004---layered-architecture)

This project follows a **Microservices Architecture** managed as a **Monorepo** using `pnpm` and `Turborepo`.

### Layered Architecture (Service Level)

Each microservice (e.g., `company-service`) implements a strict **Layered Architecture** to separate concerns:

1.  **Routes Layer**: Defines API endpoints and attaches middleware for authentication, authorization, and validation.
2.  **Controller Layer**: Orchestrates the request (Thin Controller), extracting data and handing off execution.
3.  **Service Layer**: Contains the core **Business Logic**. This is the primary location for business rules (e.g., check-in logic, leave validation).
4.  **Repository Layer**: Handles direct data access. It abstracts the database implementation and manages tenant context.

## 2. Multi-tenant Data Isolation Strategy

> **SDD Ref:** [CMP-001](./sdd.md#cmp-001-composition-view--service-decomposition), [DEC-003](./sdd.md#dec-003---isolated-mongodb-database-per-service), [INF-001](./sdd.md#inf-001-information-view--data-schema--persistence)

### Dynamic Database Switching (Logical Isolation)

Instead of a shared database with a `companyId` filter (which pose risks of data leakage), we implement **Logical Database Separation**.

- **Mongoose `useDb()`**: The repository dynamically switches context using the `companyId` provided in the request context.
- **Context Normalization**: Database names are explicitly mapped as `company_a_db`, `company_b_db`, and `attendance_db` (INF-001).
- **Security Boundaries**: Access is validated in two steps:
  1.  **Token Validation**: The JWT must contain a valid `companyId`.
  2.  **Service Authorization**: The service checks if it is authorized to handle that specifically requested `companyId` (REQ-DATA-001).

## 3. Authentication & Authorization

> **SDD Ref:** [SEC-001](./sdd.md#sec-001-interface-view---authentication--authorization-design), [REQ-QOS-01](./sdd.md#req-qos-01-security-and-data-protection), [REQ-QOS-02](./sdd.md#req-qos-02-inter-service-trust-boundaries)

### Stateless Identity Management

- **Authentication**: Uses JSON Web Token (JWT). The system is designed to be stateless, with user context injected from the token.
- **RBAC (Role-Based Access Control)**: Separates roles (e.g., `EMPLOYEE`, `ADMIN_HR`).
- **Data Ownership Model**: Combines RBAC with ownership validation. For instance, an Admin from Company B is strictly forbidden from accessing data for Company A (HTTP 403 / IDOR protection).

## 4. Indexing Strategy (ESR Guidelines)

> **SDD Ref:** [Appendix 5.1](./sdd.md#51-mongodb-index-strategy)

We utilize the **ESR (Equality, Sort, Range)** guidelines for MongoDB to ensure query performance:

- **Equality**: Filters like `employeeId` or `status`.
- **Sort**: Sorting results (e.g., `date: -1`).
- **Range**: Filtering by date ranges (e.g., `$gte: startDate`).
- **Unique Constraints**: A unique index on `employeeId` ensures data integrity and supports idempotency.

## 5. Edge Case Handling

> **SDD Ref:** [Appendix 5.3](./sdd.md#53-edge-case-handling)

1.  **Idempotency**: CRUD operations and check-in/out events utilize database-level unique constraints (Mongoose E11000) to prevent duplicate data caused by network retries.
2.  **Timezone Strategy**: All timestamps are stored in **UTC** in the database. During check-in, the system snapshots the employee's current `timezone` and `workSchedule` into the attendance document to ensure historical immutability (LOG-001, REQ-CM-02).
3.  **Overlapping Leave**: Service-level validation ensures that new leave requests do not overlap with existing "Pending" or "Approved" records.

## 6. Technology Stack Rationale

> **SDD Ref:** [DEC-004](./sdd.md#dec-004---layered-architecture), [REQ-MAINT-02](./srs.md#req-maint-02-schema-validation-with-odm)

### Transition from Prisma to Mongoose

Initially, the project used Prisma. We transitioned to **Mongoose** to fulfill the specific requirements of the technical test:

1.  **Dynamic Connection Management**: `useDb()` natively supports our multi-tenant "database-per-tenant" pattern more efficiently than Prisma.
2.  **Strict Schema Validation**: Mongoose provides robust application-level validation which is essential for enforcing data integrity before persistence.
3.  **Flexibility**: Easier management of compound indexes and complex aggregation pipelines for upcoming attendance reporting.

## 7. Architectural Trade-offs

> **SDD Ref:** [DEC-001](./sdd.md#dec-001---synchronous-rest-for-inter-service-communication), [DEC-002](./sdd.md#dec-002---database-level-aggregation-for-reporting)

### Consistency vs Availability (CAP Theorem)

- **Challenge**: Validating employee data across services (e.g., Attendance calling Company Service) creates a dependency.
- **Trade-off**: Using synchronous REST calls provides **Strong Consistency** but risks **Availability** if the target service is down.
- **Mitigation**: Eventual consistency can be tolerated for non-critical lookups through caching (e.g., Redis) or an event-driven architecture to ensure High Availability during service interruptions.

## 8. Containerization & Deployment Strategy

> **SDD Ref:** [DEP-001](./sdd.md#dep-001-deployment-view---topology), [DEC-005](./sdd.md#dec-005---api-gateway-as-single-public-entry-point), [REQ-DIST-01](./srs.md#req-dist-01)

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

### API Gateway (Nginx Reverse Proxy)

To comply with REQ-DIST-01 and DEC-005, we deploy an **Nginx reverse proxy** as the API Gateway entry point.

#### Route Mapping

| External Path | Internal Service | Internal Path |
|--------------|------------------|---------------|
| `/company-a/api/v1/*` | company-a (port 3001) | `/api/*` |
| `/company-b/api/v1/*` | company-b (port 3002) | `/api/*` |
| `/attendance/api/v1/*` | attendance (port 3003) | `/api/v1/attendances/*` |

#### Implementation

- **Nginx Service**: Defined in `docker-compose.yml` as `nginx` service
- **Configuration**: `nginx/nginx.conf` with rewrite rules for path normalization
- **Health Check**: Available at `/health` endpoint

#### Service-to-Service Communication

Internal service calls (e.g., Attendance Service calling Company Service) use **direct Docker network communication** for lower latency:

```
Attendance Service → http://company-a:3001/api/v1/internal/...
```

This is intentional as per SDD line 450 and 806 — internal APIs are not exposed through the API Gateway.

## 9. Database Topology: Logical vs Physical Isolation

> **SDD Ref:** [DEC-003](./sdd.md#dec-003---isolated-mongodb-database-per-service), [INF-001](./sdd.md#inf-001-information-view--data-schema--persistence)

A common misconception of the "Database per Service" microservice principle is that each service requires its own dedicated database **server**. In practice, the principle refers to **logical isolation** (separate databases), not necessarily **physical isolation** (separate instances).

### Current Architecture: Single Instance, Multiple Databases

We deploy a single MongoDB instance (Replica Set) that hosts multiple logically separated databases:

- `company_a_db` — owned exclusively by the Company A deployment.
- `company_b_db` — owned exclusively by the Company B deployment.
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

## 10. Logging Strategy

> **SDD Ref:** [REQ-QOS-04](./srs.md#req-qos-04-pencatatan-log-operasional-logging)

We use **Pino** as our structured logging solution to meet the observability requirements specified in REQ-QOS-04.

### Implementation

The logger is implemented as a shared package (`@jaga-id/logger`) that provides:

- **Structured JSON logging** with timestamps, level, and message
- **Sensitive data masking** - automatically redacts PII like passwords, tokens, and secrets
- **Child loggers** - services can create context-specific loggers
- **Pretty printing** in development, JSON in production

### Logged Events (per REQ-QOS-04)

The following events are logged:
- Authentication failures (missing/invalid token)
- Approval actions (approve/reject leave/permission requests)
- Service communication failures
- Report generation events

### Example Usage

```typescript
import { createChildLogger } from '@jaga-id/logger';

const logger = createChildLogger('ServiceName');

logger.info({ userId, action: 'approve' }, 'Leave request approved');
logger.warn({ path, reason: 'missing_token' }, 'Authentication failed');
```

### Security Considerations

- Password hashes, tokens, and other secrets are automatically masked
- No PII is logged in production
- Stack traces are never exposed to clients

## 11. Indexing Strategy

> **SDD Ref:** [REQ-QOS-05](./srs.md#req-qos-05-efisiensi-kueri-dan-pengindeksan-basis-data), [Appendix 5.1 SDD](./sdd.md#51-mongodb-index-strategy)

We follow the **ESR (Equality, Sort, Range)** guidelines for MongoDB indexing:

### Collections and Indexes

**employees (Company A/B DB):**
| Field(s) | Index Type | Purpose |
|----------|------------|---------|
| `_id` | Default | Primary key lookup |
| `employeeId` | Unique | Prevent duplicates, fast lookup |
| `companyId` | Single | Filter per company |
| `employmentStatus` | Single | Filter active employees |

**attendances (Attendance DB):**
| Field(s) | Index Type | Purpose |
|----------|------------|---------|
| `employeeId` | Single | Filter by employee |
| `employeeId, date` | Compound | Efficient date-range queries |
| `companyId, date` | Compound | Company-wide reports |
| `status` | Single | Filter by attendance status |

**leave_permission_requests (Attendance DB):**
| Field(s) | Index Type | Purpose |
|----------|------------|---------|
| `employeeId` | Single | Filter by employee |
| `employeeId, startDate, endDate` | Compound | Overlap detection |
| `status` | Single | Filter by approval status |
| `companyId, status` | Compound | Admin filtering |

### KPI

As specified in REQ-POC-02, report generation for 1-month range completes in **< 3 seconds** with proper indexing.

## 12. Testing Strategy

> **SDD Ref:** [REQ-COMP-03](./srs.md#req-comp-03-documentation-completeness), [REQ-DEAD-01](./srs.md#req-dead-01-delivery-deadline)

To ensure high reliability and to maintain the independent testability of our microservices, we employ a sophisticated multi-tiered testing strategy:

### 12.1. Contract Testing (Pact)

- **Challenge**: The Attendance Service relies heavily on the Company Service for employee validation, relying on synchronous cross-service APIs. Traditional End-to-End (E2E) tests for these interactions require complex, brittle environments (standing up both services and their databases).
- **Solution**: We implemented **Consumer-Driven Contract Testing** using **Pact**.
  - The Attendance Service (Consumer) defines expected HTTP interactions and boundaries in isolation, which generates a _Pact JSON contract_.
  - The Company Service (Provider) verifies its actual API responses against this generated contract during its independent CI pipeline.
  - This eliminates brittle E2E paths, providing integration safety while allowing both services to evolve and be tested rapidly in isolation.

### 12.2. "No-Domino-Effect" Unit & Integration Testing

- We enforce strict isolation in behavior-driven unit testing (via Vitest/Jest). The standard approach separates the architecture into verifiable segments without overlapping: Controllers mock Services, and Services mock Repositories.
- Supported by Codecov inside GitHub Actions, checking for coverage targets on every commit. This ensures stable production code while preventing localized failures from cascading through test suites.
