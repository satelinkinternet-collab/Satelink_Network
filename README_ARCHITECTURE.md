# Satelink Network — Modular Architecture

This project follows a clean, modular structure designed for scalability and performance.

## Project Structure

### `src/core/`
The backbone of the system. Contains high-performance, synchronous engines and buffers.
- `execution_router.js`: Routes workloads to the most appropriate execution source.
- `demand_buffer.js`: FIFO queue for incoming workloads with integrated rate limits.
- `job_queue.js` / `job_scheduler.js`: Orchestrates workload distribution.
- `logger.js`: Centralized Pino-based structured logging system.

### `src/services/`
Domain-specific business logic.
- `reputation/`: Node reputation scoring and tracking.
- `economics/`: Economic ledger, dynamic pricing, and profitability engines.
- `genesis/`: Handles periodic synthetic workload generation.
- `demand/`: Flywheel and acquisition engines for organic growth.
- `nodes/`: Node registry, heartbeat, and capacity tracking.
- `growth/`: Network metrics and node onboarding incentives.

### `src/gateways/`
External protocol adapters and entry points.
- `compatibility/`: Ethereum JSON-RPC and Generic Compute compatibility layer.
- `global/`: Global traffic balancer, edge cache, and latency routing.

### `src/security/`
The defense layer.
- `abuse_firewall.js`: Rate limiting and bad-actor mitigation.
- `auth_middleware.js`: JWT-based authentication and role enforcement.

### `src/routes/`
Express implementation of all REST and RPC endpoints.

### `src/config/`
Consolidated configuration for all system parameters and environment handling.

### `src/tests/`
Organized verification suites:
- `unit/`: Component-level isolation tests.
- `integration/`: Multi-module orchestration tests.
- `legacy/`: Historical test scripts and manual verification tools.

## Logging System
The project uses **Pino** for high-performance, structured logging.
- **Development**: Output is colorized and human-readable via `pino-pretty`.
- **Production**: Raw JSON output for ingestion into observability stacks.
- **Audit**: Critical events (errors, financial webhooks) alternate between Pino and Database persistence.

## Technologies
- **Runtime**: Node.js (ECMAScript Modules)
- **Framework**: Express
- **Database**: better-sqlite3 (Primary), PostgreSQL (Optional Fallback)
- **Logging**: Pino
- **Security**: JWT, Helmet, Rate Limiter
