export class MachineAccessRateLimiterService {
  constructor(redis) {
    this.redis = redis;
    this.memory = new Map();
  }

  async consume(tokenContext) {
    const limit = tokenContext.rateLimit || { windowMs: 60_000, max: 60 };
    const bucket = Math.floor(Date.now() / limit.windowMs);
    const key = `machine-access:limit:${tokenContext.tokenId}:${bucket}`;

    if (this.redis) {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, limit.windowMs);
      }
      if (count > limit.max) {
        throw new Error(`Machine access rate limit exceeded (${limit.max}/${limit.windowMs}ms)`);
      }
      return { count, limit: limit.max };
    }

    const current = this.memory.get(key) || 0;
    const next = current + 1;
    this.memory.set(key, next);
    if (next > limit.max) {
      throw new Error(`Machine access rate limit exceeded (${limit.max}/${limit.windowMs}ms)`);
    }
    return { count: next, limit: limit.max };
  }
}
