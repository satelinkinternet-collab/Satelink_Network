export class ReplayProtectionService {
  constructor(redis) {
    this.redis = redis;
    this.memory = new Map();
  }

  async assertNonce({ tokenId, nonce, ttlSeconds = 600 }) {
    if (!nonce) {
      throw new Error("Missing replay nonce");
    }
    const key = `machine-access:nonce:${tokenId}:${nonce}`;
    if (this.redis) {
      const result = await this.redis.set(key, "1", "EX", ttlSeconds, "NX");
      if (result !== "OK") {
        throw new Error("Replay nonce already used");
      }
      return true;
    }

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const current = this.memory.get(key);
    if (current && current > now) {
      throw new Error("Replay nonce already used");
    }
    this.memory.set(key, expiresAt);
    for (const [entryKey, entryExpiry] of this.memory.entries()) {
      if (entryExpiry <= now) this.memory.delete(entryKey);
    }
    return true;
  }
}
