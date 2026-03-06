import fuseService from './fuse.js';

export class DepositDetector {
    constructor(db) {
        this.db = db;
        this.fuse = fuseService;

        // Listen to the vaultDeposit event emitted by fuseService
        this.fuse.on('vaultDeposit', (event) => {
            console.log(`[DepositDetector] Detected deposit raw event:`, event);
            this.handleDeposit(event.from, event.amount, event.timestamp);
        });
    }

    async start() {
        if (!this.fuse.isConnected) {
            console.log(`[DepositDetector] Connecting fuseService to start monitoring...`);
            await this.fuse.connect();
        }
        this.fuse.startVaultMonitor();
        console.log(`[DepositDetector] Started monitoring RevenueVault deposits.`);
    }

    handleDeposit(walletAddress, amountUsdt, timestamp) {
        try {
            // Find if there is an enterprise client for this wallet
            const client = this.db.prepare(`
                SELECT client_id, deposit_balance, status 
                FROM enterprise_clients 
                WHERE wallet_address = ?
            `).get(walletAddress);

            if (!client) {
                console.log(`[DepositDetector] Ignored deposit of ${amountUsdt} USDT from ${walletAddress} (no matching Enterprise Client)`);
                return;
            }

            if (client.status !== 'ACTIVE') {
                console.log(`[DepositDetector] Ignored deposit for inactive client ${client.client_id}`);
                return;
            }

            // Update balance
            const newBalance = client.deposit_balance + amountUsdt;
            this.db.prepare(`
                UPDATE enterprise_clients 
                SET deposit_balance = ? 
                WHERE client_id = ?
            `).run(newBalance, client.client_id);

            console.log(`[DepositDetector] Credited ${amountUsdt} USDT to client ${client.client_id}. New balance: ${newBalance}`);
        } catch (error) {
            console.error(`[DepositDetector] Failed to process deposit for ${walletAddress}:`, error);
        }
    }
}
