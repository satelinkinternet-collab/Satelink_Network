/**
 * Automation Adapter
 *
 * Converts automation triggers (cron jobs, conditional workflow steps, scheduled tasks)
 * into the normalised internal workload format:
 *   { op_type, target, payload, reward }
 *
 * Sources: workflow engines, cron schedulers, event-driven automation pipelines
 */

export class AutomationAdapter {
    static DEFAULT_REWARD = 0.002;

    /** Accepted trigger types */
    static TRIGGER_TYPES = new Set([
        'cron', 'condition', 'event_driven', 'manual', 'chain_event'
    ]);

    /**
     * @param {Object} raw
     * @param {string} raw.trigger_type    - one of TRIGGER_TYPES
     * @param {string} raw.action          - what to execute (function name / script / URL)
     * @param {Object} [raw.context]       - runtime data passed to the action
     * @param {string} [raw.schedule]      - cron expression (for cron triggers)
     * @param {string} [raw.target]        - target service or node tag
     * @param {number} [raw.reward]
     * @returns {{ op_type, target, payload, reward }}
     */
    normalise(raw) {
        const { trigger_type, action, context = {}, schedule, target = 'automation_relay', reward } = raw;

        if (!trigger_type) throw new Error('[AutomationAdapter] trigger_type is required');
        if (!AutomationAdapter.TRIGGER_TYPES.has(trigger_type)) {
            throw new Error(`[AutomationAdapter] unsupported trigger_type: ${trigger_type}`);
        }
        if (!action) throw new Error('[AutomationAdapter] action is required');

        return {
            op_type: 'automation_job',
            target,
            payload: { trigger_type, action, context, schedule },
            reward: reward ?? AutomationAdapter.DEFAULT_REWARD
        };
    }

    canHandle(raw) {
        return raw && typeof raw.trigger_type === 'string' && typeof raw.action === 'string';
    }
}
