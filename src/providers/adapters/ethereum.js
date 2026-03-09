import { BaseAdapter } from './base_adapter.js';

export class EthereumAdapter extends BaseAdapter {
    constructor() {
        super('ethereum');
    }

    // specific Ethereum validation logic, if any, can override here
    _validateSingleRequest(req) {
        const baseValidation = super._validateSingleRequest(req);
        if (!baseValidation.valid) return baseValidation;

        // E.g. restrict certain dangerous methods or require specific params
        // if (req.method === 'eth_sendTransaction') { ... }

        return baseValidation;
    }
}
