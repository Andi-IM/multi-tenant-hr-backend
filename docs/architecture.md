# 1. Service Boundary

The system is divided based on Domain-Driven Design (DDD) principles, breaking the application into bounded contexts focused on spesific business capabilities. There will be three independent services: CompanyA Service, CompanyB Service, and Attendance Service. Each Service must have its own MongoDB database to ensure loose coupling and strict data autonomy.

# 2. Authentication Strategy

Implements a stateless authentication using JSON Web Token (JWT). The authentication process can be placed at the Edge level using an API Gateway, where the gateway validates the user's JWT token before forwarding the request (with user identity/context injection) to internal services.

# 3. Authorization Model

Combines Role-Based Access Control (RBAC) with a Data Ownership model. RBAC divides access rights based on static roles (e.g., Employee, Approver, Admin). The Data Ownership model ensures that even if a user has an Employee role, they can only perform check-ins or view reports for their own ID, not for other employees.

# 4. Indexing Strategy 

Utilizes the ESR (Equality, Sort, Range) guideline for MongoDB. In the Attendance Service, reporting queries typically search for an employeeID (Equality), sort by date (Sort), and filter by date ranges (Range). A compound index such as `{employeeId: 1, date: -1}` will be created to dramatically accelerate report data retrieval.

# 5. Edge Case Handling 

1. Duplicate Prevention (Idempotency): To prevent users from submitting duplicate requests, a Unique Compound Index will be implemented in MongoDB (e.g. `{employeeId: 1, date: 1, type: "check-in"}`) alongside idempotency keys at the API level.
2. Timezones: Check-in times will always be stored in UTC format in the database to avoid ambiguity across time zones, then converted back to the employee's inherited timezone during report aggregation.
3. Overlapping Leave: The service logic will validate that new leave date ranges do not overlap with existing leave records or those with a "Pending" status.

# 6. Trade offs

- Consistency vs Availability: When communicating with Company Services to validate employees, the Attendance Service faces a trade-off. Using synchronous API communication (REST) provides strong Consistency (always knowing immediately if an employee is deactivated), but sacrifices Availability and increases latency (if a Company Service is down, the attendance check fails; latency increases due to nested network calls).
- Trade-off Mitigation Strategy: Given that attendance is a time-critical system, Eventual Consistency will be tolerated. The Attendance Service can implement caching (e.g., Redis) for active employee data or use an event-driven architecture (message queue) to allow employees to continue checking in (High Availability) even during brief interruptions of the Company Service.

