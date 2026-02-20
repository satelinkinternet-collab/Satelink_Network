import fs from "fs";
import { spawn } from "child_process";
import http from "http";
import { chromium } from "playwright";

const cfg = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url)));
const baseUrl = cfg.baseUrl;
const healthUrl = baseUrl + cfg.healthPath;
const manageBackend = cfg.manageBackend !== false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpGet(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => resolve({ status: res.statusCode, body: data.slice(0, 5000) }));
        });
        req.on("error", reject);
        req.setTimeout(4000, () => { req.destroy(new Error("timeout")); });
    });
}

function sh(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
        let out = "", err = "";
        p.stdout.on("data", d => out += d.toString());
        p.stderr.on("data", d => err += d.toString());
        p.on("close", (code) => code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} ${args.join(" ")} failed (${code})\n${err}\n${out}`)));
    });
}

async function ensurePostgres() {
    await sh("docker", ["ps", "--filter", `name=${cfg.pgContainer}`, "--format", "{{.Names}}"]);
    // optional: wait for readiness
    await sh("docker", ["logs", "--tail", "1", cfg.pgContainer]).catch(() => ({ out: "", err: "" }));
}

async function startBackend() {
    const proc = spawn("bash", ["control_loop/run-backend.sh"], { env: process.env });
    proc.on("exit", (code) => console.log(`[CONTROL] backend exited code=${code}`));
    return proc;
}

async function stopBackend(proc) {
    try { proc.kill("SIGTERM"); } catch { }
    await sleep(800);
    try { proc.kill("SIGKILL"); } catch { }
}

async function browserCheck(paths) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];
    try {
        for (const p of paths) {
            const url = baseUrl + p;
            const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
            const status = resp?.status() ?? 0;
            const title = await page.title().catch(() => "");
            const consoleErrors = [];
            page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
            await page.waitForTimeout(400);
            results.push({ url, status, title, consoleErrors: consoleErrors.slice(0, 5) });
            if (status >= 400 || (consoleErrors && consoleErrors.length)) {
                await page.screenshot({ path: `artifacts/fail-${Date.now()}.png`, fullPage: true });
            }
        }
    } finally {
        await browser.close();
    }
    return results;
}

async function snapshot(reason) {
    fs.mkdirSync("artifacts", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `artifacts/snapshot-${stamp}.txt`;
    const lines = [];
    lines.push(`[SNAPSHOT] reason=${reason}`);
    lines.push(`[SNAPSHOT] time=${new Date().toISOString()}`);
    try { lines.push((await sh("lsof", ["-nP", "-iTCP:8080", "-sTCP:LISTEN"])).out.trim()); } catch (e) { lines.push(String(e)); }
    try { lines.push((await sh("docker", ["ps"])).out.trim()); } catch (e) { lines.push(String(e)); }
    fs.writeFileSync(path, lines.join("\n\n") + "\n");
    return path;
}

(async () => {
    let backoff = 1000;
    let backendProc = null;

    while (true) {
        try {
            await ensurePostgres();
            if (!backendProc || backendProc.exitCode !== null) {
                backendProc = await startBackend();
                await sleep(1500); // Wait for the backend process to fully come online
            }

            const health = await httpGet(healthUrl);
            if (health.status !== 200) throw new Error(`health status=${health.status} body=${health.body.slice(0, 200)}`);

            const checks = await browserCheck([...cfg.dashboards, ...cfg.uiChecks]);
            const bad = checks.filter(x => x.status >= 400 || (x.consoleErrors && x.consoleErrors.length));
            if (bad.length) throw new Error(`browser check failed: ${JSON.stringify(bad)}`);

            console.log(`STATUS: OK — health=200 dashboards=${checks.length} backoff=${Math.round(backoff / 1000)}s`);
            backoff = 1000;
            await sleep(4000);

        } catch (e) {
            console.log(`STATUS: FAIL — ${e.message}`);
            const snap = await snapshot(e.message);
            console.log(`STATUS: SNAPSHOT_SAVED — ${snap}`);

            if (backendProc) await stopBackend(backendProc);
            await sleep(backoff);
            backoff = Math.min(backoff * 2, (cfg.maxBackoffSec || 30) * 1000);
        }
    }
})();
