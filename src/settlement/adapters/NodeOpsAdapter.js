import { BaseSettlementAdapter } from './BaseSettlementAdapter.js';

const DEFAULT_BASE_URL = 'https://api-createos.nodeops.network';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;
const API_PREFIX = '/v1';

/**
 * NodeOpsAdapter — Satelink settlement adapter for NodeOps CreateOS.
 *
 * Maps the Satelink 7-method adapter interface to CreateOS REST API operations:
 *   healthCheck  → GET /v1/user
 *   estimateBatch → read-only cost stub (CreateOS has no fee oracle)
 *   validateBatch → validates batch shape + API key validity
 *   createBatch  → creates project → environment → deployment on CreateOS
 *   getBatchStatus → GET deployment status
 *   cancelBatch  → POST cancel deployment (queued/building only)
 *
 * Env vars:
 *   NODEOPS_CREATEOS_API_KEY  (required)
 *   NODEOPS_CREATEOS_BASE_URL (default: https://api-createos.nodeops.network)
 *   NODEOPS_TIMEOUT_MS        (default: 15000)
 *   NODEOPS_AUTH_MODE         (default: x-api-key) - also supports: bearer, apikey, token
 *   NODEOPS_ORG_ID            (optional) - sets X-Org-Id header
 *   NODEOPS_WORKSPACE_ID      (optional) - sets X-Workspace-Id header
 */
export class NodeOpsAdapter extends BaseSettlementAdapter {
    constructor(config = {}) {
        super();
        this.apiKey = config.apiKey || process.env.NODEOPS_CREATEOS_API_KEY;
        if (!this.apiKey) {
            throw new Error('NODEOPS_CREATEOS_API_KEY is required for NodeOpsAdapter');
        }

        this.baseUrl = (config.baseUrl || process.env.NODEOPS_CREATEOS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
        this.timeoutMs = Number(config.timeoutMs || process.env.NODEOPS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
        this.maxRetries = Number(config.maxRetries || process.env.NODEOPS_MAX_RETRIES) || DEFAULT_MAX_RETRIES;
        this.enabled = true;

        this.authMode = (config.authMode || process.env.NODEOPS_AUTH_MODE || 'x-api-key').toLowerCase();
        this.orgId = config.orgId || process.env.NODEOPS_ORG_ID;
        this.workspaceId = config.workspaceId || process.env.NODEOPS_WORKSPACE_ID;

        console.log(`[NodeOpsAdapter] Initialized (Auth: ${this.authMode})`);
    }

    getName() {
        return 'NODEOPS';
    }

    // ── Core adapter interface ──────────────────────────────────────────

    async healthCheck() {
        if (!this.enabled) return { ok: false, error: 'NODEOPS_CREATEOS_API_KEY not set', latency_ms: 0 };
        const start = Date.now();
        try {
            const user = await this._get(`${API_PREFIX}/users/me`);
            return { ok: true, latency_ms: Date.now() - start, user: user.email || user.id || 'unknown' };
        } catch (e) {
            return { ok: false, latency_ms: Date.now() - start, error: e.message };
        }
    }

    async estimateBatch(batch) {
        throw new Error('Not supported: NodeOps CreateOS has no fee oracle.');
    }

    async validateBatch(batch) {
        if (!this.enabled) return { valid: false, error: 'NodeOps adapter disabled (no API key)' };
        if (!batch.items || batch.items.length === 0) return { valid: false, error: 'Empty batch' };

        // Validate connectivity
        try {
            await this._get(`${API_PREFIX}/users/me`);
        } catch (e) {
            return { valid: false, error: `NodeOps API unreachable: ${e.message}` };
        }
        return { valid: true };
    }

    /**
     * createBatch — maps a Satelink batch to a CreateOS deployment.
     *
     * Strategy: each batch item becomes one deployment under a shared project.
     * The batch.meta_json (parsed) can supply:
     *   projectId       — existing project ID (skip create)
     *   environmentId   — existing env ID     (skip create)
     *   uniqueName      — project unique name  (required if creating)
     *   displayName     — project display name
     *   runtime         — e.g. "node:20"
     *   port            — e.g. 3000
     *   image           — container image for image-type projects
     *   files           — array of {path, content} for upload-type projects
     */
    async createBatch(batch) {
        if (!this.enabled) throw new Error('NodeOps adapter disabled');

        const meta = typeof batch.meta_json === 'string' ? JSON.parse(batch.meta_json || '{}') : (batch.meta_json || {});
        let projectId = meta.projectId;
        let environmentId = meta.environmentId;

        // 1. Ensure project exists
        if (!projectId) {
            const uniqueName = meta.uniqueName || `sl-${batch.id}`.slice(0, 32);
            const project = await this._post(`${API_PREFIX}/projects`, {
                uniqueName,
                displayName: meta.displayName || `Satelink batch ${batch.id}`,
                type: meta.image ? 'image' : (meta.files ? 'upload' : 'vcs'),
                settings: {
                    runtime: meta.runtime || 'node:20',
                    port: meta.port || 3000,
                    installCommand: meta.installCommand || 'npm install',
                    buildCommand: meta.buildCommand || 'npm run build',
                    runCommand: meta.runCommand || 'npm start',
                }
            });
            projectId = project.id;
        }

        // 2. Ensure environment exists
        if (!environmentId) {
            const env = await this._post(`${API_PREFIX}/projects/${projectId}/environments`, {
                displayName: meta.envDisplayName || 'production',
                uniqueName: meta.envUniqueName || 'production',
            });
            environmentId = env.id;
        }

        // 3. Create deployment(s) — one per batch item, or single if no items need individual deploys
        const deploymentIds = [];
        for (const item of batch.items) {
            const itemMeta = typeof item.meta_json === 'string' ? JSON.parse(item.meta_json || '{}') : (item.meta_json || {});
            let deployment;

            if (itemMeta.image || meta.image) {
                // Image-based deployment
                deployment = await this._post(`${API_PREFIX}/projects/${projectId}/deployments`, {
                    image: itemMeta.image || meta.image,
                });
            } else if (itemMeta.files || meta.files) {
                // File-upload deployment
                deployment = await this._put(`${API_PREFIX}/projects/${projectId}/deployments/files`, {
                    files: itemMeta.files || meta.files,
                });
            } else {
                // Trigger VCS build
                deployment = await this._post(`${API_PREFIX}/projects/${projectId}/deployments/trigger`, {
                    branch: itemMeta.branch || meta.branch || 'main',
                });
            }
            deploymentIds.push(deployment.id);
        }

        const externalRef = `NODEOPS:${projectId}:${deploymentIds.join(',')}`;
        return {
            external_ref: externalRef,
            status: 'processing',
            meta: { projectId, environmentId, deploymentIds }
        };
    }

    async getBatchStatus(external_ref) {
        if (!external_ref || !external_ref.startsWith('NODEOPS:')) return { status: 'unknown' };
        const [, projectId, deploymentIdsCsv] = external_ref.split(':');
        const deploymentIds = deploymentIdsCsv.split(',').filter(Boolean);

        const statuses = [];
        for (const did of deploymentIds) {
            try {
                const d = await this._get(`${API_PREFIX}/projects/${projectId}/deployments/${did}`);
                statuses.push(d.status);
            } catch {
                statuses.push('unknown');
            }
        }

        // Map CreateOS statuses → Satelink statuses
        const mapped = statuses.map(s => this._mapStatus(s));
        if (mapped.every(s => s === 'completed')) return { status: 'completed', completed_at: Date.now() };
        if (mapped.some(s => s === 'failed')) return { status: 'failed', meta: { statuses } };
        return { status: 'processing', meta: { statuses } };
    }

    async cancelBatch(external_ref) {
        if (!external_ref || !external_ref.startsWith('NODEOPS:')) return { success: false, error: 'Invalid ref' };
        const [, projectId, deploymentIdsCsv] = external_ref.split(':');
        const deploymentIds = deploymentIdsCsv.split(',').filter(Boolean);

        let cancelled = 0;
        for (const did of deploymentIds) {
            try {
                await this._post(`${API_PREFIX}/projects/${projectId}/deployments/${did}/cancel`);
                cancelled++;
            } catch {
                // only queued/building can be cancelled
            }
        }
        return { success: cancelled > 0, meta: { cancelled, total: deploymentIds.length } };
    }

    // ── Extended NodeOps operations (non-adapter-interface) ─────────────

    async getCurrentUser() {
        return this._get(`${API_PREFIX}/users/me`);
    }

    async listProjects(limit = 5) {
        return this._get(`${API_PREFIX}/projects?limit=${limit}`);
    }

    async getDeploymentLogs(projectId, deploymentId, type = 'build') {
        const logType = type === 'runtime' ? 'runtime' : 'build';
        return this._get(`${API_PREFIX}/projects/${projectId}/deployments/${deploymentId}/logs/${logType}`);
    }

    async retryDeployment(projectId, deploymentId) {
        return this._post(`${API_PREFIX}/projects/${projectId}/deployments/${deploymentId}/retry`, {});
    }

    async wakeDeployment(projectId, deploymentId) {
        return this._post(`${API_PREFIX}/projects/${projectId}/deployments/${deploymentId}/wake`);
    }

    // ── HTTP helpers with retry + timeout ───────────────────────────────

    async _get(path) {
        return this._request('GET', path);
    }

    async _post(path, body) {
        return this._request('POST', path, body);
    }

    async _put(path, body) {
        return this._request('PUT', path, body);
    }

    async _request(method, path, body) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await this._doFetch(method, path, body);
            } catch (e) {
                lastError = e;
                const retryable = e.statusCode === 429 || (e.statusCode >= 500 && e.statusCode < 600) || e.name === 'AbortError';
                if (!retryable || attempt === this.maxRetries) throw e;
                const delay = RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 500;
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw lastError;
    }

    async _doFetch(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const opts = {
            method,
            headers: {
                'Accept': 'application/json',
            },
            signal: controller.signal,
        };

        if (this.authMode === 'bearer') {
            opts.headers['Authorization'] = `Bearer ${this.apiKey}`;
        } else if (this.authMode === 'apikey') {
            opts.headers['Authorization'] = `ApiKey ${this.apiKey}`;
        } else if (this.authMode === 'token') {
            opts.headers['Authorization'] = `Token ${this.apiKey}`;
        } else {
            // Default x-api-key
            opts.headers['X-Api-Key'] = this.apiKey;
        }

        if (this.orgId) {
            opts.headers['X-Org-Id'] = this.orgId;
        }
        if (this.workspaceId) {
            opts.headers['X-Workspace-Id'] = this.workspaceId;
        }

        if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(url, opts);
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') throw Object.assign(new Error(`NodeOps request timed out (${this.timeoutMs}ms): ${method} ${path}`), { statusCode: 0 });
            throw Object.assign(new Error(`NodeOps network error: ${e.message}`), { statusCode: 0 });
        }
        clearTimeout(timer);

        let json;
        const text = await res.text();
        try { json = JSON.parse(text); } catch { json = null; }

        if (!res.ok || (json && json.error)) {
            const code = json?.error?.code || `HTTP_${res.status}`;
            const msg = json?.error?.message || (text.length > 200 ? text.slice(0, 200) + '...' : text) || 'Unknown Error';
            const err = new Error(`NodeOps API error [${code}]: ${msg}`);
            err.statusCode = res.status;
            err.nodeOpsCode = code;
            throw err;
        }

        // Unwrap envelope: { status: "success", data: { ... } }
        if (json && json.status === 'success' && json.data !== undefined) return json.data;
        return json;
    }

    // ── Status mapping ──────────────────────────────────────────────────

    _mapStatus(createOsStatus) {
        switch (createOsStatus) {
            case 'deployed': return 'completed';
            case 'failed': return 'failed';
            case 'queued':
            case 'building':
            case 'deploying': return 'processing';
            case 'sleeping': return 'completed'; // deployed but sleeping
            default: return 'processing';
        }
    }
}
