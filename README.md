# Sample Hardhat 3 Beta Project (minimal)

This project has a minimal setup of Hardhat 3 Beta, without any plugins.

## What's included?

The project includes native support for TypeScript, Hardhat scripts, tasks, and support for Solidity compilation and tests.

---

## Permissionless Onboarding API

Satelink now supports a permissionless registration flow for any new operators joining the network. All onboarding endpoints follow strict limits (`AUTH_RATE_LIMIT_PER_MIN` threshold, defaulting to 10/min) over an IP hashing validation filter.

## Simulation vs Live Mode

Satelink operates in two primary modes dictated by the `SATELINK_MODE` environment variable:
*   **SIMULATION**: Uses simulated data, mock rewards, and fake transactions. Ideal for testing and safe development.
*   **LIVE**: Connects to actual settlement adapters and smart contracts. **WARNING:** This mode involves real transactions.

To switch between modes, update `SATELINK_MODE` in your `.env` file and restart the system.

### Configuration / Required Env Vars
*   `JWT_SECRET`: The system secret used to issue valid tokens. Must be >= 64 characters. Cannot be empty.
*   `IP_HASH_SALT`: Key used for custom IP-hashing to establish rate limit protections accurately.
*   `PASSWORD_SALT`: Used for salting the SHA256 hashes generated during authentication. Default fallback to `JWT_SECRET` if not provided.

Remember to review [Mode Safety Matrix](docs/mode-safety-matrix.md), [API Surface Governance](docs/api-surface-governance.md), [Safety Locks](docs/safety-locks.md), and [Operator Flags & Readiness Gate](docs/operator-flags.md) before pushing to production or `LIVE` execution environments.

### Environment Variables
Live mode refuses to start if required variables missing. (Documentation only — do not enforce yet.)

### API Routes

#### 1. Register
**POST `/auth/register`**  
Create a new identity without admin intervention and receive a `node_operator` scoped JWT.

*Request Body:*
```json
{
  "email": "user@example.com",
  "password": "securepassword123!"
}
```

*Response (200 OK):*
```json
{
  "ok": true,
  "token": "eyJhbG...<jwt>",
  "user": {
    "id": "user@example.com",
    "email": "user@example.com",
    "role": "node_operator"
  }
}
```

#### 2. Login
**POST `/auth/login`**  
Generate a JWT for existing users.

*Request Body:*
```json
{
  "email": "user@example.com",
  "password": "securepassword123!"
}
```

#### 3. Token Verification
**GET `/me`**  
Verifies a token and outputs the active permissions set.

*Request Header:*
`Authorization: Bearer <your-jwt-token>`

*Response:*
```json
{
  "ok": true,
  "user": {
    "wallet": "user@example.com",
    "role": "node_operator",
    "permissions": ["view_dashboard", "view_node_stats", "claim_rewards"],
    "exp": 1771863061,
    "iss": "satelink-network"
  }
}
```

*Usage note: By design, `email` corresponds intrinsically with `wallet` identifiers within database events to seamlessly ensure interoperability with existing platform flows!*
