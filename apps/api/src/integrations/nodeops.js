/**
 * NodeOps Client Adapter
 */
export async function nodeOpsPing() {
    const apiKey = process.env.NODEOPS_API_KEY;
    const baseUrl = process.env.NODEOPS_BASE_URL || "https://api-createos.nodeops.network";

    if (!apiKey) {
        return { ok: false, error: "NODEOPS_API_KEY not set" };
    }

    try {
        const res = await fetch(`${baseUrl}/mcp`, {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
            }
        });

        if (!res.ok) {
            const text = await res.text();
            return { ok: false, status: res.status, error: text };
        }

        const data = await res.json();
        return { ok: true, data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}
