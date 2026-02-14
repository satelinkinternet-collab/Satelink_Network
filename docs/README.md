# Satelink API Documentation

Welcome to the Satelink Network API documentation. This guide is intended for internal developers and future staff members integrating with the Satelink platform.

## Getting Started

### 1. Access the API Specs
The full OpenAPI 3.0 specification is available interactively at:
**[http://localhost:8080/api-docs](http://localhost:8080/api-docs)**

### 2. Authentication
Most endpoints require a **Bearer Token**.
To get a token in the **Development Environment**, use the test login endpoint:

```bash
curl -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin_super", "role":"admin_super"}'
```

### 3. Role-Based Access Control (RBAC)
- **Super Admin** (`admin_super`): Unlimited access. Can pause withdrawals.
- **Support Admin** (`admin_support`): Read-only access to stats.
- **Node Operator** (`node_operator`): Can access own node stats and claim earnings.
- **Distributor** (`distributor_lco`): Can manage fleet and view commissions.

## Project Structure
- `src/routes/`: API Route definitions (Split by domain).
- `src/services/`: Core business logic (`OperationsEngine`).
- `docs/`: Documentation files (`swagger.yaml`).
