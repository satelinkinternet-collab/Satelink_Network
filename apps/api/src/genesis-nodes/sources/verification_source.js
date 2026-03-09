/**
 * Verification Source
 *
 * Produces real integrity/health verification tasks:
 *   - api_health_check       → verify external API endpoints respond correctly
 *   - signature_verification → verify on-chain or off-chain signatures
 *   - dataset_integrity      → check data hashes/checksums
 *
 * Each task has a unique target + timestamp so the same check isn't
 * re-enqueued within the dedup window.
 */

const API_ENDPOINTS = [
    'https://api.coingecko.com/api/v3/ping',
    'https://api.etherscan.io/api?module=stats&action=ethsupply',
    'https://api.llama.fi/protocols',
    'https://api.dexscreener.com/latest/dex/tokens/ETH'
];

const SIGNATURE_TYPES = ['secp256k1', 'ed25519', 'bls12_381'];
const DATASET_CHECKSUMS = ['block_header_hash', 'tx_root', 'state_root', 'receipt_root'];
const TASK_TYPES = ['api_health_check', 'signature_verification', 'dataset_integrity'];

export class VerificationSource {
    constructor(batchSize = 2) {
        this.name = 'verification';
        this.batchSize = batchSize;
        this._cycle = 0;
        this._counters = { generated: 0 };
    }

    /**
     * Generate verification tasks.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    generate() {
        const tasks = [];
        const ts = Math.floor(Date.now() / 30_000);   // 30-second bucket

        for (let i = 0; i < this.batchSize; i++) {
            const taskType = TASK_TYPES[(this._cycle + i) % TASK_TYPES.length];
            let payload;
            let target;

            switch (taskType) {
                case 'api_health_check': {
                    const url = API_ENDPOINTS[(this._cycle + i) % API_ENDPOINTS.length];
                    target = url;
                    payload = { source: this.name, operation: taskType, url, ts };
                    break;
                }
                case 'signature_verification': {
                    const sigType = SIGNATURE_TYPES[(this._cycle + i) % SIGNATURE_TYPES.length];
                    target = 'signature_verifier';
                    payload = {
                        source: this.name,
                        operation: taskType,
                        sig_type: sigType,
                        // Synthetic but deterministic signer address
                        signer: `0x${(this._cycle * 7 + i * 13).toString(16).padStart(40, '0')}`,
                        ts
                    };
                    break;
                }
                case 'dataset_integrity': {
                    const checkType = DATASET_CHECKSUMS[(this._cycle + i) % DATASET_CHECKSUMS.length];
                    target = 'integrity_checker';
                    payload = { source: this.name, operation: taskType, check_type: checkType, ts };
                    break;
                }
            }

            tasks.push({ op_type: 'data_processing', target, payload, reward: 0.0001, source: this.name });
        }

        this._cycle++;
        this._counters.generated += tasks.length;
        return tasks;
    }

    stats() { return { source: this.name, ...this._counters }; }
}
