export class WithdrawalProcessor {
    constructor(db) {
        this.db = db;
    }

    async start() {
        console.log('[WithdrawalProcessor] (Mock) Started monitoring withdrawals.');
    }
}
