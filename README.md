# Jaga ID Technical Test

[![CI — Build, Test & Coverage](https://github.com/Andi-IM/multi-tenant-hr-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Andi-IM/multi-tenant-hr-backend/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Andi-IM/multi-tenant-hr-backend/graph/badge.svg)](https://codecov.io/gh/Andi-IM/multi-tenant-hr-backend)

This repository implements a microservices architecture managed as a monorepo.

## Project Structure

The codebase is organized into workspaces using **pnpm** and coordinated using **Turborepo**. We use a shared-container deployment strategy for identical business services:

- `services/*`: Contains deployable microservices (`company-service`, `attendance`).
- `packages/*`: Contains shared configurations and libraries (TS config, ESLint config, Prettier config) to ensure consistency across services.

## Documentation & Design

For a deep dive into our architectural decisions and data isolation strategies, refer to:

- [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md): Explains the Layered Architecture, Dynamic Mongoose Multi-tenancy, Containerization Strategy, and Rationale.
- [**docs/srs.md**](./docs/srs.md): Software Requirements Specification.
- [**docs/sdd.md**](./docs/sdd.md): Software Design Document.

## API Gateway & Documentation (Swagger)

We use **Nginx** as an API Gateway to route requests to the appropriate services. Each service provides interactive Swagger UI documentation.

### Accessing via Gateway (Docker)

When running via Docker Compose, all services are accessible through the API Gateway on port **80**:

- **Company A API Docs:** [http://localhost/company-a/api-docs](http://localhost/company-a/api-docs)
- **Company B API Docs:** [http://localhost/company-b/api-docs](http://localhost/company-b/api-docs)
- **Attendance Service API Docs:** [http://localhost/attendance/api-docs](http://localhost/attendance/api-docs)

### Direct Access (Local Development)

If running services individually or without the gateway:

- **Company Service:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs) (Default)
- **Attendance Service:** [http://localhost:3002/api-docs](http://localhost:3002/api-docs) (Default)

> [!NOTE]
> To use the Swagger UI for protected endpoints, you must obtain a valid JWT token (e.g., from the login endpoint) and click the **Authorize** button.

## Setup & Installation

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (Version 18+ recommended)
- [pnpm](https://pnpm.io/installation) (version `9.0.0` as specified)

### Installation Steps

1. **Navigate to the project root directory:**
   ```bash
   cd path/to/multi-tenant-hr-backend
   ```
2. **Install Dependencies:**
   ```bash
   pnpm install
   ```
   _Because we use Turborepo and pnpm workspaces, this single command handles installing dependencies and linking internal workspaces for all `packages/` and `services/`._

## Running the Project

### Using Docker Compose (Recommended)

The easiest way to run the entire backend system (including MongoDB with Replica Set) is via Docker Compose.

```bash
docker compose up --build
```

> [!CAUTION]
> **Avoid using the `-d` (detached) flag.** Running the system in the background might cause some services or the database initialization to fail silently or terminate unexpectedly without immediate visibility. Running in the foreground ensures you can monitor the startup logs and health checks in real-time.

This single command will:

1. Build optimized images for all services using `turbo prune`.
2. Start MongoDB and automatically initialize its Replica Set.
3. Start the `company-a` instance and `company-b` instance using the shared `company-service` image.
4. Start the `attendance` service.
5. Start the **Nginx API Gateway** on port **80**.

To view logs:

```bash
docker compose logs -f
```

### Local Development Mode

To start all microservices simultaneously without Docker (requires a local MongoDB running):

```bash
pnpm run dev
```

### Building the Project

To build all services and shared packages:

```bash
pnpm run build
```

### Formatting, Linting, and Testing

To format the codebase cleanly according to Prettier standards:

```bash
pnpm run format
```

To run the linter (ESLint) across the entire monorepo:

```bash
pnpm run lint
```

To execute unit and contract tests (using Vitest and Pact) across all workspaces:

```bash
pnpm run test
```

> **Testing Note:** We use **Pact** for consumer-driven contract testing between the Attendance and Company services, avoiding brittle End-to-End tests. We also use **Codecov** in our GitHub Actions CI pipeline to strictly enforce a "No-Domino-Effect" unit testing strategy. Run `pnpm run test:coverage` to generate local coverage reports.
