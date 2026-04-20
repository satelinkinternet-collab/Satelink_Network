import { ethers } from 'ethers';
import { OperationsEngine } from '../src/core/operations_engine.js';
import { DepositDetector } from '../src/settlement/deposit_detector.js';
import { WithdrawalProcessor } from '../src/settlement/withdrawal_processor.js';
import fuseService from '../src/security/fuse.js';

// Configuration
const CLIENT_WALLET = ethers.Wallet.createRandom().address;
const NODE_WALLET = ethers.Wallet.createRandom().address;

// Async Mock DB
class MockDB {
    constructor() {
        this.tables = {
            enterprise_clients: [],
            revenue_events_v2: [],
            epochs: [],
            epoch_earnings: [],
            withdrawals: [],
            registered_nodes: [],
            node_uptime: [],
            ops_pricing: [],
            system_config: [
                { key: 'system_state', value: 'LIVE' },
                { key: 'withdrawals_paused', value: '0' },
                { key: 'security_freeze', value: '0' }
            ]
        };
    }

    prepare(sql) {
        const self = this;
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        const normalize = (args) => (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
        return {
            async run(...rawArgs) {
                const args = normalize(rawArgs);
                console.log(`[MockDB] RUN: ${normalizedSql}`, args);
                if (normalizedSql.includes('INSERT INTO enterprise_clients')) {
                    self.tables.enterprise_clients.push({ client_id: args[0], company_name: args[1], wallet_address: args[2], deposit_balance: 0, status: 'ACTIVE' });
                } else if (normalizedSql.includes('UPDATE enterprise_clients SET deposit_balance')) {
                   const client = self.tables.enterprise_clients.find(c => c.client_id === args[1]);
                   if (client) client.deposit_balance = args[0];
                } else if (normalizedSql.includes('INSERT INTO revenue_events_v2')) {
                    self.tables.revenue_events_v2.push({ epoch_id: args[0], op_type: args[1], amount_usdt: args[4], request_id: args[5], created_at: Date.now()/1000 });
                } else if (normalizedSql.includes('INSERT INTO epochs')) {
                    const id = self.tables.epochs.length + 1;
                    self.tables.epochs.push({ id, status: 'OPEN' });
                    return { lastInsertRowid: id };
                } else if (normalizedSql.includes('UPDATE epochs SET status = \'FINALIZED\'')) {
                    const epoch = self.tables.epochs.find(e => e.id === args[1]);
                    if (epoch) epoch.status = 'FINALIZED';
                    return { changes: 1 };
                } else if (normalizedSql.includes('INSERT INTO epoch_earnings')) {
                    // Extract values based on query structure or args
                    let role = 'unknown';
                    let wallet = 'unknown';
                    let amount = 0;
                    if (normalizedSql.includes('node_operator')) {
                        role = 'node_operator';
                        wallet = args[1];
                        amount = args[2];
                    } else if (normalizedSql.includes('platform')) {
                        role = 'platform';
                        wallet = 'PLATFORM_TREASURY';
                        amount = args[1];
                    } else if (normalizedSql.includes('distribution_pool')) {
                        role = 'distribution_pool';
                        wallet = 'DAO_POOL';
                        amount = args[1];
                    }
                    self.tables.epoch_earnings.push({ epoch_id: args[0], role, wallet_or_node_id: wallet, amount_usdt: amount, status: 'UNPAID' });
                } else if (normalizedSql.includes('UPDATE epoch_earnings SET status = \'CLAIMED\'')) {
                    self.tables.epoch_earnings.forEach(e => { if (e.wallet_or_node_id === args[2] && e.status === 'UNPAID') e.status = 'CLAIMED'; });
                } else if (normalizedSql.includes('INSERT INTO withdrawals')) {
                    const id = args[0];
                    self.tables.withdrawals.push({ id, wallet: args[1], amount_usdt: args[2], status: args[3], created_at: args[5] });
                    return { lastInsertRowid: id };
                } else if (normalizedSql.includes('UPDATE withdrawals SET status')) {
                    const w = self.tables.withdrawals.find(w => w.id === args[1]);
                    if (w) w.status = args[0];
                } else if (normalizedSql.includes('INSERT INTO system_config')) {
                    self.tables.system_config.push({ key: args[0], value: args[1] });
                }
                return { changes: 1, lastInsertRowid: 1 };
            },
            async get(...rawArgs) {
                const args = normalize(rawArgs);
                console.log(`[MockDB] GET: ${normalizedSql}`, args);
                if (normalizedSql.includes('SELECT client_id, deposit_balance, status FROM enterprise_clients')) {
                    return self.tables.enterprise_clients.find(c => c.wallet_address.toLowerCase() === args[0].toLowerCase()) || null;
                } else if (normalizedSql.includes('SELECT id FROM revenue_events_v2')) {
                    return null;
                } else if (normalizedSql.includes('SELECT id FROM epochs WHERE status = \'OPEN\'')) {
                    return self.tables.epochs.find(e => e.status === 'OPEN') || null;
                } else if (normalizedSql.includes('SELECT SUM(amount_usdt) as total FROM revenue_events_v2')) {
                    const res = { total: self.tables.revenue_events_v2.filter(r => r.epoch_id === args[0]).reduce((s, r) => s + r.amount_usdt, 0) };
                    console.log(`[MockDB]   -> Result:`, res);
                    return res;
                } else if (normalizedSql.includes('SELECT SUM(amount_usdt) as total FROM epoch_earnings')) {
                    return { total: self.tables.epoch_earnings.filter(e => e.wallet_or_node_id === args[0] && e.status === 'UNPAID').reduce((s, e) => s + e.amount_usdt, 0) };
                } else if (normalizedSql.includes('SELECT * FROM ops_pricing')) {
                    return { op_type: 'ai_inference', price_usdt: 0.10, enabled: 1 };
                } else if (normalizedSql.includes('SELECT 1 FROM conversions')) {
                    return null;
                } else if (normalizedSql.includes('SELECT value FROM system_config')) {
                    return self.tables.system_config.find(c => c.key === args[0]) || null;
                } else if (normalizedSql.includes('SELECT COUNT(*) as c FROM revenue_events_v2')) {
                    return { c: 0 };
                }
                return null;
            },
            async all(...rawArgs) {
                const args = normalize(rawArgs);
                console.log(`[MockDB] ALL: ${normalizedSql}`, args);
                if (normalizedSql.includes('FROM withdrawals WHERE status = \'PENDING\'')) {
                    return self.tables.withdrawals.filter(w => w.status === 'PENDING');
                } else if (normalizedSql.includes('FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = \'UNPAID\'')) {
                     return self.tables.epoch_earnings.filter(e => e.wallet_or_node_id === args[0] && e.status === 'UNPAID');
                } else if (normalizedSql.includes('FROM node_uptime u')) {
                    // This matches the join query in finalizeEpoch
                    return [{ node_wallet: NODE_WALLET, uptime_seconds: 3600, node_type: 'NORMAL', management_type: 'self_hosted' }];
                }
                return [];
            }
        };
    }

    transaction(fn) {
        const self = this;
        return async function() {
            return await fn(self);
        };
    }
}

async function runTest() {
    console.log("--- STARTING E2E PIPELINE VERIFICATION ---");
    
    // Inject Env if missing for Fuse

    const db = new MockDB();
    const opsEngine = new OperationsEngine(db);
    const depositDetector = new DepositDetector(db);
    const withdrawalProcessor = new WithdrawalProcessor(db);

    // 0. Connect Fuse
    console.log("[Test] Connecting to Fuse...");
    await fuseService.connect();

    // 1. Setup Test Data
    console.log("[Test] Creating Enterprise Client and Node...");
    await db.prepare("INSERT INTO enterprise_clients (client_id, company_name, wallet_address) VALUES (?, ?, ?)").run('client_e2e_1', 'E2E Corp', CLIENT_WALLET);

    // 2. Simulate Deposit
    console.log("[Test] Simulating USDT Deposit Detection...");
    await depositDetector.handleDeposit(CLIENT_WALLET, 10.0, Date.now());

    // 3. Execute Job
    console.log("[Test] Executing Job via OperationsEngine...");
    const jobId = 'job_' + Date.now();
    await opsEngine.executeOp({
        op_type: 'ai_inference',
        node_id: 'node_e2e_1',
        client_id: 'client_e2e_1',
        request_id: jobId,
        payload_hash: ethers.keccak256(ethers.toUtf8Bytes('test'))
    });

    // 4. Close Epoch and Allocate Rewards
    console.log("[Test] Finalizing Epoch...");
    const currentEpoch = opsEngine.currentEpochId;
    await opsEngine.finalizeEpoch(currentEpoch);

    // 5. Generate Claim
    console.log("[Test] Creating Claim with valid signature...");
    const testSigner = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));
    const nodeWalletAddress = testSigner.address;
    
    // Update earnings to match this new node wallet
    console.log(`[Test] Updating earnings for ${NODE_WALLET} -> ${nodeWalletAddress}`);
    db.tables.epoch_earnings.forEach(e => { if (e.wallet_or_node_id === NODE_WALLET) e.wallet_or_node_id = nodeWalletAddress; });
    console.log(`[Test] Unclaimed earnings in DB:`, db.tables.epoch_earnings.filter(e => e.status === 'UNPAID'));
    
    const message = `CLAIM_REWARDS:${nodeWalletAddress.toLowerCase()}`;
    const signature = await testSigner.signMessage(message);
    
    await opsEngine.claim(nodeWalletAddress, signature);

    // 6. Process Withdrawal (Real Fuse Transaction)
    console.log("[Test] Processing Withdrawal via WithdrawalProcessor...");
    await withdrawalProcessor.processPendingWithdrawals();

    console.log("--- E2E PIPELINE VERIFICATION COMPLETE ---");
    process.exit(0);
}

runTest().catch(err => {
    console.error("E2E Test Failed:", err);
    process.exit(1);
});
