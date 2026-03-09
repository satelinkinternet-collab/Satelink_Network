# NodeOps CreateOS Settlement Adapter

The `NodeOpsAdapter` integrates the Satelink Settlement Engine with the [NodeOps CreateOS API](https://api-createos.nodeops.network). It maps the standard 7-method settlement interface (designed originally for on-chain crypto transactions) into project deployments on CreateOS.

## Features Supported

*   **Health Check**: Validates API key and connectivity using `/v1/user`.
*   **Validation**: Verifies basic connectivity before processing a batch.
*   **Creation**: Maps a settlement batch to a CreateOS deployment.
*   **Status Polling**: Checks deployment status and maps CreateOS states (queued, deploying, deployed, failed, sleeping) to Satelink states (processing, completed, failed).
*   **Cancellation**: Allows cancelling a `queued` or `deploying` build via `/v1/projects/:id/deployments/:id/cancel`.
*   **Logging**: Exposes an extended method to grab build logs (`getBatchLogs`).

## Required Environment Variables

To enable the adapter, you must configure your API key in the `.env` file or export it in your environment directly before running scripts:

```bash
export NODEOPS_CREATEOS_API_KEY="your_api_key_here"
```

**Optional Variables:**

*   `NODEOPS_AUTH_MODE`: Choose an authentication mechanism acceptable by your CreateOS enterprise setup. Options: `x-api-key` (default), `bearer`, `apikey`, `token`.
*   `NODEOPS_ORG_ID`: If operating under an organization context, include the Org ID here and it will be sent as the `X-Org-Id` header.
*   `NODEOPS_WORKSPACE_ID`: If operating under a workspace context, include the Workspace ID here and it will be sent as the `X-Workspace-Id` header.
*   `NODEOPS_CREATEOS_BASE_URL`: Overrides the default base URL. Useful for testing against different environments (Default: `https://api-createos.nodeops.network`).
*   `NODEOPS_TIMEOUT_MS`: The request timeout in milliseconds (Default: `15000`).
*   `NODEOPS_MAX_RETRIES`: The maximum number of retry attempts for network errors and rate limits (429) (Default: `3`).

## Running the Smoke Test

Before enabling the adapter in the main engine, you should run the read-only smoke test to verify connectivity and authentication:

```bash
node scripts/smoke_nodeops.js
```

### Smoke Test Output

If successful, the script will output your user identity and list up to 5 of your recent projects.
**Note:** The smoke test is strictly `READ-ONLY`. It will not create, modify, or delete any projects or deployments.

### Common Errors

*   **401 Unauthorized / 403 Forbidden:** The `NODEOPS_CREATEOS_API_KEY` is missing, incorrect, or lacks required permissions.
*   **429 Too Many Requests:** You are hitting the NodeOps rate limits. The adapter has built-in exponential backoff to handle this during production runs, but prolonged throttling might still fail the batch.
*   **Network Error / Timeout:** Ensure `NODEOPS_CREATEOS_BASE_URL` is correct and that your environment can reach the internet. If requests consistently timeout, consider increasing `NODEOPS_TIMEOUT_MS`.

## Using the Adapter in Production

To use this adapter, you must update the `AdapterRegistry` or the system flag:

```sql
UPDATE system_flags SET value='nodeops' WHERE key='settlement_adapter';
```
