# Jaga ID Technical Test

This repository implements a microservices architecture managed as a monorepo.

## Project Structure

The codebase is organized into workspaces using **pnpm** and coordinated using **Turborepo**:

*   `services/*`: Contains deployable microservices (e.g., `company-a`, `company-b`, `attendance`).
*   `packages/*`: Contains shared configurations and libraries (e.g., TS config, ESLint config) to ensure consistency across services.

## Rationale: Why Turborepo & pnpm?

We chose **Turborepo** in combination with **pnpm** to orchestrate this monorepo for several key reasons:

1.  **Strict Dependency Management (pnpm):** `pnpm` utilizes symlinks and a single global store, which is highly space-efficient and completely prevents "phantom dependencies" (where a service accidentally uses a package it didn't explicitly install). This brings robust stability to the monorepo.
2.  **Blazing Fast Execution (pnpm + Turbo):** `pnpm` is extremely fast at installing packages.
3.  **Efficient Caching (Turborepo):** Turborepo caches the outputs of builds and tests. If a service hasn't changed, Turborepo will replay the cached results instantly instead of re-running the task.
4.  **Parallel Execution:** Turborepo schedules tasks (like `build` or `lint`) across all workspaces in parallel, maximizing CPU utilization.
5.  **Simplified Developer Experience:** A single command (`pnpm run dev`) at the root can intelligently start the watch mode for all microservices simultaneously with clear, interleaved console output.

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

You can run commands from the root directory that apply to all workspaces.

### Development Mode

To start all microservices simultaneously in development mode (with hot-reloading if supported by the service):

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
