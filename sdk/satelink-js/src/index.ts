import axios, { AxiosInstance, AxiosError } from 'axios';

export interface SatelinkConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    debug?: boolean;
}

export interface OpRequest {
    opType: string;
    payload: Record<string, any>;
    idempotencyKey?: string;
}

export interface SatelinkResponse<T> {
    ok: boolean;
    data?: T;
    error?: string;
    message?: string;
    trace_id?: string;
    request_id?: string;
}

export class SatelinkClient {
    private client: AxiosInstance;
    private debug: boolean;

    constructor(config: SatelinkConfig) {
        this.debug = config.debug || false;
        this.client = axios.create({
            baseURL: config.baseUrl || 'https://api.satelink.network',
            timeout: config.timeout || 10000,
            headers: {
                'X-API-Key': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        // Response Interceptor for Logging & Error Handling
        this.client.interceptors.response.use(
            response => {
                if (this.debug) console.log(`[Satelink] ${response.status} ${response.config.url}`);
                return response;
            },
            async error => {
                if (this.debug && error.response) {
                    console.error(`[Satelink] Error ${error.response.status}:`, error.response.data);
                }
                const traceId = error.response?.headers?.['x-trace-id'];
                if (traceId) {
                    error.message += ` (Trace ID: ${traceId})`;
                }

                // Simple Retry on 429 (Rate Limit) -> Basic implementation
                // In a full prod SDK we might use axios-retry
                if (error.response?.status === 429) {
                    // We could implement backoff here, but for MVP SDK we just expose the error
                    // effectively fulfilling "Surface trace_id". 
                    // To strictly "Retry on 429", let's do one retry after 1s.
                    if (!error.config._retry) {
                        error.config._retry = true;
                        await new Promise(r => setTimeout(r, 1000));
                        return this.client(error.config);
                    }
                }
                throw error;
            }
        );
    }

    async executeOp(req: OpRequest): Promise<SatelinkResponse<any>> {
        try {
            const headers: Record<string, string> = {};
            if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;

            const res = await this.client.post('/v1/ops/execute', {
                op_type: req.opType,
                payload: req.payload
            }, { headers });

            return res.data;
        } catch (e: any) {
            return this._formatError(e);
        }
    }

    async getPricing(): Promise<SatelinkResponse<any[]>> {
        try {
            const res = await this.client.get('/v1/ops/pricing');
            return res.data;
        } catch (e) { return this._formatError(e); }
    }

    async getStatus(): Promise<SatelinkResponse<{ status: string }>> {
        try {
            const res = await this.client.get('/v1/status');
            return res.data;
        } catch (e) { return this._formatError(e); }
    }

    async getNetworkStats(): Promise<SatelinkResponse<any>> {
        try {
            const res = await this.client.get('/v1/network-stats');
            return res.data;
        } catch (e) { return this._formatError(e); }
    }

    async getUsageSummary(): Promise<SatelinkResponse<any>> {
        try {
            const res = await this.client.get('/v1/usage/summary');
            return res.data;
        } catch (e) { return this._formatError(e); }
    }

    private _formatError(e: any): SatelinkResponse<any> {
        if (axios.isAxiosError(e) && e.response?.data) {
            return e.response.data as SatelinkResponse<any>;
        }
        return {
            ok: false,
            error: 'SDK_ERROR',
            message: e.message
        };
    }
}
