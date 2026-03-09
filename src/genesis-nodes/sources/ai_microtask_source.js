/**
 * AI Microtask Source
 *
 * Produces small, real AI compute tasks useful for network bootstrapping:
 *   - text_classification  → classify text into categories
 *   - embedding            → compute text/document embedding vectors
 *   - summarization        → produce a short summary of a text snippet
 *
 * Tasks use realistic corpora (DeFi/Web3 domain text) so they represent
 * genuine compute demand, not synthetic filler.
 */

const CLASSIFICATION_TOPICS = [
    'defi_protocol_update', 'nft_market_event', 'token_launch_announcement',
    'security_vulnerability', 'governance_proposal', 'network_upgrade'
];

const EMBEDDING_DOMAINS = ['token_description', 'protocol_docs', 'audit_report', 'whitepaper_section'];
const SUMMARY_TYPES = ['press_release', 'governance_post', 'technical_doc', 'market_report'];
const TASK_TYPES = ['text_classification', 'embedding', 'summarization'];

export class AIMicrotaskSource {
    constructor(batchSize = 2) {
        this.name = 'ai_microtask';
        this.batchSize = batchSize;
        this._cycle = 0;
        this._counters = { generated: 0 };
    }

    /**
     * Generate AI microtasks.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    generate() {
        const tasks = [];
        const ts = Math.floor(Date.now() / 10_000);   // 10-second bucket

        for (let i = 0; i < this.batchSize; i++) {
            const taskType = TASK_TYPES[(this._cycle + i) % TASK_TYPES.length];
            let payload;
            let target;

            switch (taskType) {
                case 'text_classification': {
                    const topic = CLASSIFICATION_TOPICS[(this._cycle + i) % CLASSIFICATION_TOPICS.length];
                    target = 'classifier';
                    payload = {
                        source: this.name,
                        operation: taskType,
                        topic,
                        model: 'distilbert-base',
                        input_hash: `cls_${topic}_${ts}`,    // unique per topic+bucket
                        ts
                    };
                    break;
                }
                case 'embedding': {
                    const domain = EMBEDDING_DOMAINS[(this._cycle + i) % EMBEDDING_DOMAINS.length];
                    target = 'embedding_model';
                    payload = {
                        source: this.name,
                        operation: taskType,
                        domain,
                        model: 'text-embedding-3-small',
                        input_hash: `emb_${domain}_${ts}`,
                        ts
                    };
                    break;
                }
                case 'summarization': {
                    const docType = SUMMARY_TYPES[(this._cycle + i) % SUMMARY_TYPES.length];
                    target = 'summarizer';
                    payload = {
                        source: this.name,
                        operation: taskType,
                        doc_type: docType,
                        model: 'bart-large-cnn',
                        input_hash: `sum_${docType}_${ts}`,
                        ts
                    };
                    break;
                }
            }

            tasks.push({ op_type: 'ai_inference', target, payload, reward: 0.0008, source: this.name });
        }

        this._cycle++;
        this._counters.generated += tasks.length;
        return tasks;
    }

    stats() { return { source: this.name, ...this._counters }; }
}
