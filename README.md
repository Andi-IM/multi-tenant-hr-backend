# Jaga ID Technical Test

This repository implements a microservices architecture managed as a monorepo.

## Project Structure

The codebase is organized into workspaces using **pnpm** and coordinated using **Turborepo**. We use a shared-container deployment strategy for identical business services:

*   `services/*`: Contains deployable microservices (e.g., `company-service`, `attendance`).
*   `packages/*`: Contains shared configurations and libraries (e.g., TS config, ESLint config) to ensure consistency across services.

## Documentation & Design

For a deep dive into our architectural decisions and data isolation strategies, refer to:
- [**docs/architecture.md**](./docs/architecture.md): Explains the Layered Architecture, Dynamic Mongoose Multi-tenancy, Containerization Strategy, and Rationale.
- [**SRS.md**](./SRS.md): Software Requirements Specification.

## API Documentation (Swagger)

Each service provides interactive Swagger UI documentation for testing and exploring the API.

-   **Company A (Mapped Service):** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
-   **Company B (Mapped Service):** [http://localhost:3002/api-docs](http://localhost:3002/api-docs)
-   **Attendance Service**: (Coming soon)

> [!NOTE]
> To use the Swagger UI for protected endpoints, you must obtain a valid JWT token (e.g., from a login endpoint or by running the test suite's token generator helper) and click the **Authorize** button.

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
   *Because we use Turborepo and pnpm workspaces, this single command handles installing dependencies and linking internal workspaces for all `packages/` and `services/`.*

## Running the Project

### Using Docker Compose (Recommended)

The easiest way to run the entire backend system (including MongoDB with Replica Set) is via Docker Compose.

```bash
docker compose up -d --build
```
This single command will:
1. Build optimized images for all services using `turbo prune`.
2. Start MongoDB and automatically initialize its Replica Set.
3. Start the `company-a` instance (Port 3001) and `company-b` instance (Port 3002) using the shared `company-service` image.
4. Start the `attendance` service (Port 3003).

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

### Linting and Testing

To run the linter and tests across the entire monorepo:

```bash
pnpm run lint
pnpm run test
```
