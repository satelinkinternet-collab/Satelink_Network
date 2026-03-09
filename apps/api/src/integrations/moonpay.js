import crypto from "crypto";

/**
 * Verify MoonPay Webhook Signature v2
 * Uses HMAC-SHA256(secret, rawBody)
 */
export function verifyMoonPay(req, secret) {
    const signature = req.headers["moonpay-signature-v2"];
    if (!signature || !secret) return false;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(req.rawBody || "");
    const expectedSignature = hmac.digest("hex");

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (e) {
        return false;
    }
}
