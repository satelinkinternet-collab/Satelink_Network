import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(nodeScrypt);

export class TokenHashingService {
  async hashTokenSecret(secret) {
    const salt = randomBytes(16).toString("hex");
    const derived = await scrypt(secret, salt, 64);
    return {
      algorithm: "scrypt",
      salt,
      hash: Buffer.from(derived).toString("hex"),
    };
  }

  async verifyTokenSecret(secret, storedHash, salt) {
    const derived = await scrypt(secret, salt, 64);
    const actual = Buffer.from(derived).toString("hex");
    const left = Buffer.from(actual, "hex");
    const right = Buffer.from(storedHash, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }
}
