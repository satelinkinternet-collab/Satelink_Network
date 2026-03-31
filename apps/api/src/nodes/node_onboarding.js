import { NodeRegistry } from '../nodes/node_registry.js';

export class NodeOnboardingService {
  constructor(db) {
    this.db = db;
  }

  async registerNode(node_id, capacity) {
    try {
      if (!node_id) {
        return { error: "node_id required" };
      }

      console.log("REGISTER HIT:", node_id);

      // UPSERT into node_registry
      await this.db.prepare(`
        INSERT INTO node_registry (
          node_id, node_type, region, capacity, reputation, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(node_id) DO UPDATE SET
          capacity = excluded.capacity
      `).run(
        node_id,
        null,
        null,
        capacity || 0,
        0,
        'active'
      );

      // Fetch inserted row
      const node = await this.db.prepare(
        `SELECT * FROM node_registry WHERE node_id = ?`
      ).get(node_id);

      console.log("INSERT RESULT:", node);

      return {
        ok: true,
        node
      };

    } catch (err) {
      console.error("REGISTER ERROR:", err);
      return { error: err.message };
    }
  }
}
