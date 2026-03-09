import { BaseAdapter } from './base_adapter.js';

export class SolanaAdapter extends BaseAdapter {
    constructor() {
        super('solana');
    }

    _validateSingleRequest(req) {
        const baseValidation = super._validateSingleRequest(req);
        if (!baseValidation.valid) return baseValidation;

        // Solana specific methods validation could go here
        return baseValidation;
    }
}
