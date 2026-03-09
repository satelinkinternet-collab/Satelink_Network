/**
 * AI Source Connector
 *
 * Discovers AI inference workloads from job queues or API relay endpoints.
 *
 * Supported op sub-types:
 *   llm_completion, embedding, image_generation, classification
 *
 * In production these come from Satelink partner AI relay endpoints.
 * In simulation mode, synthetic AI workloads are generated.
 */

const AI_JOB_TYPES = ['llm_completion', 'embedding', 'image_generation', 'classification'];
const DEFAULT_REWARD = 0.0010;

export class AIConnector {
    constructor(opts = {}) {
        this.name = 'ai';
        this.enabled = true;
        this.relayUrl = opts.relayUrl || 'https://ai-relay.satelink.network/queue';
        this._counters = { discovered: 0, accepted: 0, rejected: 0 };
    }

    /**
     * Discover pending AI inference workloads.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    async discover() {
        if (!this.enabled) return [];

        const workloads = [];
        const count = Math.floor(Math.random() * 3) + 1;   // 1-3 per cycle
        for (let i = 0; i < count; i++) {
            const jobType = AI_JOB_TYPES[Math.floor(Math.random() * AI_JOB_TYPES.length)];
            workloads.push({
                op_type: 'ai_inference',
                target: jobType,
                payload: {
                    model: jobType === 'llm_completion' ? 'gpt-4' : 'clip-vit',
                    input: `sample_input_${Date.now()}_${i}`,
                    params: { temperature: 0.7, max_tokens: 256 }
                },
                reward: DEFAULT_REWARD,
                source: 'ai',
                _discovered_at: Date.now()
            });
        }
        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return { source: this.name, enabled: this.enabled, ...this._counters };
    }
}
