/**
 * AI Adapter
 *
 * Converts AI inference requests (LLM completions, embedding generation,
 * image synthesis, etc.) into the normalised internal workload format:
 *   { op_type, target, payload, reward }
 *
 * Sources: AI inference relays, developer API calls for model execution
 */

export class AiAdapter {
    static DEFAULT_REWARD = 0.005;
    static MAX_PROMPT_CHARS = 8000;    // sane limit on prompt length

    /** Known model family identifiers — used for routing */
    static MODEL_FAMILIES = new Set([
        'openai', 'anthropic', 'gemini', 'llama', 'mistral',
        'stable-diffusion', 'whisper', 'embedding'
    ]);

    /**
     * @param {Object} raw
     * @param {string} raw.model            - model identifier (e.g. 'gpt-4', 'claude-3')
     * @param {string} [raw.prompt]         - text prompt
     * @param {Object} [raw.messages]       - chat-style messages array
     * @param {Object} [raw.params]         - model parameters (temperature, max_tokens, etc.)
     * @param {string} [raw.target]         - preferred inference provider key
     * @param {number} [raw.reward]
     * @returns {{ op_type, target, payload, reward }}
     */
    normalise(raw) {
        const { model, prompt, messages, params = {}, target = 'ai_relay', reward } = raw;

        if (!model) throw new Error('[AiAdapter] model is required');
        if (!prompt && !messages) throw new Error('[AiAdapter] prompt or messages is required');

        if (prompt && prompt.length > AiAdapter.MAX_PROMPT_CHARS) {
            throw new Error(`[AiAdapter] prompt exceeds ${AiAdapter.MAX_PROMPT_CHARS} character limit`);
        }

        return {
            op_type: 'ai_inference',
            target,
            payload: { model, prompt, messages, params },
            reward: reward ?? AiAdapter.DEFAULT_REWARD
        };
    }

    canHandle(raw) {
        return raw && typeof raw.model === 'string' && (raw.prompt || raw.messages);
    }
}
