import { ethers } from 'ethers';

export class MerkleTree {
    constructor(leaves) {
        this.leaves = leaves;
        this.tree = this.buildTree(this.leaves);
    }

    buildTree(leaves) {
        if (leaves.length === 0) return [ethers.ZeroHash];
        let nodes = leaves;
        let tree = [nodes];

        while (nodes.length > 1) {
            let nextLevel = [];
            for (let i = 0; i < nodes.length; i += 2) {
                if (i + 1 < nodes.length) {
                    const left = nodes[i];
                    const right = nodes[i + 1];
                    const sorted = [left, right].sort();
                    const hash = ethers.keccak256(ethers.concat([sorted[0], sorted[1]]));
                    nextLevel.push(hash);
                } else {
                    nextLevel.push(nodes[i]);
                }
            }
            tree.push(nextLevel);
            nodes = nextLevel;
        }
        return tree;
    }

    getRoot() {
        if (this.tree.length === 0) return ethers.ZeroHash;
        return this.tree[this.tree.length - 1][0];
    }

    getProof(leaf) {
        let index = this.leaves.findIndex(l => l === leaf);
        if (index === -1) return [];
        let proof = [];

        for (let level = 0; level < this.tree.length - 1; level++) {
            const isRightNode = index % 2 === 1;
            const siblingIndex = isRightNode ? index - 1 : index + 1;

            if (siblingIndex < this.tree[level].length) {
                proof.push(this.tree[level][siblingIndex]);
            }
            index = Math.floor(index / 2);
        }
        return proof;
    }
}

export class RevenueOracle {
    constructor(fuseService, dbInstance) {
        this.fuse = fuseService;
        this.db = dbInstance;
    }

    async init() {
        // Ensure table exists for epoch anchoring
        await this.db.prepare(`
            CREATE TABLE IF NOT EXISTS epoch_anchors (
                epoch_id INTEGER PRIMARY KEY,
                merkle_root TEXT NOT NULL,
                total_revenue TEXT NOT NULL,
                tx_hash TEXT,
                anchored_at INTEGER,
                status TEXT DEFAULT 'PENDING'
            )
        `).run();

        await this.db.prepare(`
            CREATE TABLE IF NOT EXISTS epoch_claims (
                id SERIAL PRIMARY KEY,
                epoch_id INTEGER NOT NULL,
                operator_wallet TEXT NOT NULL,
                amount_usdt TEXT NOT NULL,
                leaf_hash TEXT NOT NULL,
                proof TEXT,
                UNIQUE(epoch_id, operator_wallet)
            )
        `).run();

        return true;
    }

    async anchorEpoch(epochId) {
        // 1. Fetch all rewards for this epoch
        const rewards = await this.db.prepare(`
            SELECT operator_wallet, SUM(reward_amount) as total
            FROM node_rewards
            WHERE epoch_id = ? AND status = 'FINALIZED'
            GROUP BY operator_wallet
        `).all(epochId);

        if (rewards.length === 0) {
            console.log(`No rewards found for epoch ${epochId}`);
            return null;
        }

        let totalRevenue = 0n;
        const leaves = [];

        // 2. Generate Leaves
        for (const r of rewards) {
            const amountBN = ethers.parseUnits(r.total.toString(), 6);
            totalRevenue += amountBN;

            const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'address', 'uint256'],
                [epochId, r.operator_wallet, amountBN]
            );
            // Double hash per OpenZeppelin standard leaf encoding
            const leaf = ethers.keccak256(ethers.concat([ethers.keccak256(encoded)]));

            leaves.push({ operator: r.operator_wallet, amount: amountBN.toString(), leaf });
        }

        // 3. Generate Merkle Tree
        const treeLeaves = leaves.map(l => l.leaf);
        const tree = new MerkleTree(treeLeaves);
        const root = tree.getRoot();

        // Save proofs
        for (const l of leaves) {
            const proof = tree.getProof(l.leaf);
            await this.db.prepare(`
                INSERT OR IGNORE INTO epoch_claims (epoch_id, operator_wallet, amount_usdt, leaf_hash, proof)
                VALUES (?, ?, ?, ?, ?)
            `).run(epochId, l.operator, l.amount, l.leaf, JSON.stringify(proof));
        }

        // 4. Record to DB
        await this.db.prepare(`
            INSERT OR REPLACE INTO epoch_anchors (epoch_id, merkle_root, total_revenue, status)
            VALUES (?, ?, ?, 'PENDING')
        `).run(epochId, root, totalRevenue.toString());

        // 5. Submit to Fuse via fuseService
        try {
            console.log(`[RevenueOracle] Submitting root ${root} for epoch ${epochId}`);
            const tx = await this.fuse.submitEpochRoot(epochId, root, totalRevenue.toString());

            await this.db.prepare(`
                UPDATE epoch_anchors
                SET status = 'ANCHORED', tx_hash = ?, anchored_at = ?
                WHERE epoch_id = ?
            `).run(tx.hash, Date.now(), epochId);

            console.log(`[RevenueOracle] Epoch ${epochId} anchored successfully!`);
            return tx.hash;
        } catch (error) {
            console.error(`[RevenueOracle] Failed to anchor epoch ${epochId}:`, error);
            await this.db.prepare(`
                UPDATE epoch_anchors
                SET status = 'FAILED'
                WHERE epoch_id = ?
            `).run(epochId);
            throw error;
        }
    }

    async getClaimData(epochId, operatorWallet) {
        const row = await this.db.prepare(`
            SELECT * FROM epoch_claims WHERE epoch_id = ? AND operator_wallet = ?
        `).get(epochId, operatorWallet);
        if (!row) return null;
        row.proof = JSON.parse(row.proof);
        return row;
    }
}
