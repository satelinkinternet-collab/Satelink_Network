/**
 * Verify Fuse Webhook via IP Allowlist
 */
export function verifyFuseWebhook(req) {
    const defaultAllowlist = [
        "35.191.17.80",
        "35.191.17.87",
        "35.191.17.84",
        "35.191.24.103"
    ];

    const override = process.env.FUSE_WEBHOOK_IP_ALLOWLIST;
    const allowlist = override ? override.split(",").map(val => val.trim()) : defaultAllowlist;

    // Use req.ip which is set if 'trust proxy' is enabled
    const clientIp = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    const isOk = allowlist.includes(clientIp);

    return {
        ok: isOk,
        ip: clientIp,
        reason: isOk ? "Authorized IP" : "IP not in allowlist"
    };
}
