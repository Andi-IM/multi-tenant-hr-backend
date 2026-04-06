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

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- [Node.js](https://nodejs.org/) (Version 18+ recommended, for local development)
- [pnpm](https://pnpm.io/installation) (version `9.0.0` as specified, for local development)

## Quick Start (Docker Compose)

1. Start the stack:
   ```bash
   docker compose up --build
   ```
2. Access Swagger: http://localhost/company-a/api-docs
3. Login (check Swagger `/auth/login`) to get a JWT token, then click Authorize

## Concept: What is Multi-Tenant?

This system implements **multi-tenancy** where a single application serves multiple companies (tenants) with isolated data. Each tenant (Company A, Company B) has separate database/schema but uses the same service image.

## Environment Variables

This repository does not commit `.env` files (only `.env.example` templates). How you set environment variables depends on how you run the project.

### Docker Compose (Recommended)

You can run `docker compose up --build` without creating a `.env` file because the compose file provides defaults. However, for a realistic setup you should set your own secrets.

Optionally create a `.env` file in the project root (same directory as `docker-compose.yml`):

```env
JWT_SECRET=your-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars
```

Docker Compose automatically reads this file and substitutes `${...}` variables in `docker-compose.yml`.

### Local Development (.env per service)

Each service loads environment variables via `dotenv` from its own working directory. Copy the templates:

```bash
cp services/company-service/.env.example services/company-service/.env
cp services/attendance/.env.example services/attendance/.env
```

Then adjust values as needed:

- `services/company-service/.env`: `MONGODB_URI`, `JWT_SECRET`, `COMPANY_ID`, `PORT`
- `services/attendance/.env`: `MONGODB_URI`, `COMPANY_SERVICE_URL`, `JWT_SECRET`, `PORT`

## Database Setup

### With Docker (Recommended)
Already included automatically in `docker compose up`.

### Local MongoDB
1. Install MongoDB Community Server
2. Start MongoDB (default: `mongodb://localhost:27017`)
3. Ensure each service's `MONGODB_URI` points to a reachable database (see the `.env` files above)

## Local Development (Without Docker)

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.example` templates (see Environment Variables section above)
3. Start MongoDB locally
4. Start all services:
   ```bash
   pnpm run dev
   ```

### Running Individual Services

```bash
# Company Service only
pnpm --filter company-service dev

# Attendance Service only
pnpm --filter attendance-service dev
```

## Troubleshooting

### Error: "MongoDB connection refused"
- Make sure MongoDB is running and the `MONGODB_URI` you configured is reachable

### Error: "Port already in use"
- Change port in `.env` or kill the process using that port

### Error: "JWT token invalid"
- Make sure `JWT_SECRET` in .env matches the one used when generating the token

### Container cannot connect to MongoDB
- Make sure MongoDB container is healthy before services start
- Check network: `docker network ls`

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
- **Attendance Service:** [http://localhost:3003/api-docs](http://localhost:3003/api-docs) (Default)

> [!NOTE]
> To use the Swagger UI for protected endpoints, you must obtain a valid JWT token (e.g., from the login endpoint) and click the **Authorize** button.

## Development Commands

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
