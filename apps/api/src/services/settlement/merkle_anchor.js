/**
 * S7-002: Merkle Root Anchoring
 *
 * Computes a merkle root from revenue events and anchors it to epoch_ledger.
 * Called during epoch close for on-chain verifiability.
 */

import { createHash } from 'crypto';

const hash = (s) => createHash('sha256').update(s).digest('hex');

export async function anchorEpoch(epochId, pool) {
  try {
    const events = await pool.query(
      'SELECT id, client_id, amount_usdt, created_at FROM revenue_events_v2 WHERE status = $1 ORDER BY id',
      ['completed']
    );

    if (events.rows.length === 0) {
      const emptyRoot = hash('empty');
      await pool.query(
        'UPDATE epoch_ledger SET merkle_root = $1 WHERE id = $2',
        [emptyRoot, epochId]
      );
      console.log(`[Settlement] Epoch ${epochId} anchored (empty): ${emptyRoot.slice(0, 16)}...`);
      return emptyRoot;
    }

    const leaves = events.rows.map(r =>
      hash(`${epochId}:${r.client_id}:${r.amount_usdt}:${r.created_at}`)
    );

    let level = leaves;
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(hash(level[i] + (level[i + 1] || level[i])));
      }
      level = next;
    }

    const merkleRoot = level[0];

    await pool.query(
      'UPDATE epoch_ledger SET merkle_root = $1 WHERE id = $2',
      [merkleRoot, epochId]
    );

    console.log(`[Settlement] Epoch ${epochId} anchored: ${merkleRoot.slice(0, 16)}... (${events.rows.length} events)`);
    return merkleRoot;
  } catch (err) {
    console.error('[Settlement] anchorEpoch failed:', err.message);
    throw err;
  }
}

export function computeMerkleRoot(leaves) {
  if (leaves.length === 0) return hash('empty');

  let level = leaves.map(l => hash(l));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(hash(level[i] + (level[i + 1] || level[i])));
    }
    level = next;
  }

  return level[0];
}

export function verifyMerkleProof(leaf, proof, root) {
  let current = hash(leaf);
  for (const { hash: sibling, position } of proof) {
    if (position === 'left') {
      current = hash(sibling + current);
    } else {
      current = hash(current + sibling);
    }
  }
  return current === root;
}
