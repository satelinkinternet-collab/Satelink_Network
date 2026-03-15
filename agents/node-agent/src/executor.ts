import axios, { AxiosError } from 'axios';

export interface ExecutionResult {
    success: boolean;
    result: any;
    error: string | null;
    duration_ms: number;
}

interface Job {
    job_id: string;
    type: string;
    payload: any;
    reward: number;
    timeout_ms: number;
}

/**
 * WorkloadExecutor handles type-specific job execution on the node agent.
 * Supports: rpc_call, ai_inference, webhook_delivery, automation_job
 */
export class WorkloadExecutor {
    private chainRpcUrl: string;
    private aiEndpoint: string;

    constructor(opts: { chainRpcUrl?: string; aiEndpoint?: string } = {}) {
        this.chainRpcUrl = opts.chainRpcUrl || process.env.CHAIN_RPC_URL || 'http://localhost:8545';
        this.aiEndpoint = opts.aiEndpoint || process.env.AI_INFERENCE_URL || 'http://localhost:11434/api/generate';
    }

    async execute(job: Job): Promise<ExecutionResult> {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), job.timeout_ms || 30000);

        try {
            let result: any;
            switch (job.type) {
                case 'rpc_call':
                    result = await this.executeRPC(job, controller.signal);
                    break;
                case 'ai_inference':
                    result = await this.executeAI(job, controller.signal);
                    break;
                case 'webhook_delivery':
                    result = await this.executeWebhook(job, controller.signal);
                    break;
                case 'automation_job':
                    result = await this.executeAutomation(job, controller.signal);
                    break;
                default:
                    throw new Error(`Unsupported job type: ${job.type}`);
            }

            return {
                success: true,
                result,
                error: null,
                duration_ms: Date.now() - start
            };
        } catch (err: any) {
            const isTimeout = err.name === 'AbortError' || err.code === 'ERR_CANCELED';
            return {
                success: false,
                result: null,
                error: isTimeout ? 'execution_timeout' : err.message,
                duration_ms: Date.now() - start
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * RPC job: forwards JSON-RPC call to chain_rpc_url, returns result.
     */
    private async executeRPC(job: Job, signal: AbortSignal): Promise<any> {
        // Use chain-specific RPC URL from job payload, fall back to constructor default
        const targetUrl = job.payload.chain_rpc_url || this.chainRpcUrl;

        const rpcPayload = {
            jsonrpc: '2.0',
            id: job.payload.id || 1,
            method: job.payload.method || 'eth_blockNumber',
            params: job.payload.params || []
        };

        const resp = await axios.post(targetUrl, rpcPayload, { signal });
        if (resp.data.error) {
            throw new Error(`RPC error: ${resp.data.error.message}`);
        }
        return resp.data.result;
    }

    /**
     * AI inference job: calls AI inference endpoint with model/prompt.
     */
    private async executeAI(job: Job, signal: AbortSignal): Promise<any> {
        const aiPayload = {
            model: job.payload.model || 'default',
            prompt: job.payload.prompt,
            stream: false,
            ...(job.payload.options || {})
        };

        const resp = await axios.post(this.aiEndpoint, aiPayload, {
            signal,
            timeout: job.timeout_ms || 30000
        });
        return resp.data;
    }

    /**
     * Webhook delivery: delivers HTTP POST to target URL with payload and retry.
     */
    private async executeWebhook(job: Job, signal: AbortSignal): Promise<any> {
        const targetUrl = job.payload.target_url;
        if (!targetUrl) throw new Error('webhook_delivery requires payload.target_url');

        const resp = await axios.post(targetUrl, job.payload.body || {}, {
            signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Satelink-Job-Id': job.job_id,
                ...(job.payload.headers || {})
            },
            validateStatus: (status) => status < 500 // 4xx is not a node failure
        });

        return { status: resp.status, body: resp.data };
    }

    /**
     * Automation compute job: executes a sandboxed compute task.
     * For now, supports HTTP-based automation (call URL, return result).
     */
    private async executeAutomation(job: Job, signal: AbortSignal): Promise<any> {
        const steps = job.payload.steps || [job.payload];
        const results: any[] = [];

        for (const step of steps) {
            if (step.action === 'http_request') {
                const resp = await axios({
                    method: step.method || 'GET',
                    url: step.url,
                    data: step.body,
                    headers: step.headers,
                    signal
                });
                results.push({ status: resp.status, data: resp.data });
            } else if (step.action === 'transform') {
                // Simple JSON transform - extract fields
                const lastResult = results[results.length - 1];
                if (lastResult && step.extract) {
                    results.push(step.extract.reduce((acc: any, key: string) => {
                        acc[key] = lastResult.data?.[key];
                        return acc;
                    }, {}));
                }
            } else {
                throw new Error(`Unknown automation step action: ${step.action}`);
            }
        }

        return results;
    }
}
