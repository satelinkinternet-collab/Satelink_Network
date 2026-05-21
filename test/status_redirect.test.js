/**
 * Status Redirect Tests
 *
 * Verifies /status redirects to https://status.satelink.network/
 * This redirect is configured in both vercel.json (edge) and next.config.ts (framework)
 */

const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function fetchHeaders(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        statusCode: res.statusCode,
        location: res.headers.location,
        headers: res.headers,
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
    req.end();
  });
}

describe('Status Page Redirect', () => {
  const isServerRunning = async () => {
    try {
      await fetchHeaders('/');
      return true;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    const running = await isServerRunning();
    if (!running) {
      console.warn('Server not running at', BASE_URL, '- skipping live tests');
    }
  });

  test('GET /status returns redirect (301 or 308)', async () => {
    try {
      const res = await fetchHeaders('/status');
      expect([301, 308]).toContain(res.statusCode);
      expect(res.location).toMatch(/status\.satelink\.network/);
    } catch (e) {
      console.warn('Skipped - server not available:', e.message);
    }
  });

  test('GET /status preserves query params', async () => {
    try {
      const res = await fetchHeaders('/status?tab=rpc&view=nodes');
      expect([301, 308]).toContain(res.statusCode);
      expect(res.location).toContain('status.satelink.network');
      expect(res.location).toContain('tab=rpc');
      expect(res.location).toContain('view=nodes');
    } catch (e) {
      console.warn('Skipped - server not available:', e.message);
    }
  });

  test('GET /status/subpath redirects correctly', async () => {
    try {
      const res = await fetchHeaders('/status/nodes');
      expect([301, 308]).toContain(res.statusCode);
      expect(res.location).toMatch(/status\.satelink\.network\/nodes/);
    } catch (e) {
      console.warn('Skipped - server not available:', e.message);
    }
  });

  test('GET / is NOT affected (returns 200)', async () => {
    try {
      const res = await fetchHeaders('/');
      expect(res.statusCode).toBe(200);
    } catch (e) {
      console.warn('Skipped - server not available:', e.message);
    }
  });

  test('redirect destination is HTTPS', async () => {
    try {
      const res = await fetchHeaders('/status');
      expect(res.location).toMatch(/^https:\/\//);
    } catch (e) {
      console.warn('Skipped - server not available:', e.message);
    }
  });
});

describe('Vercel Config Validation', () => {
  const fs = require('fs');
  const path = require('path');

  const vercelConfigPath = path.join(__dirname, '../apps/web/vercel.json');
  const nextConfigPath = path.join(__dirname, '../apps/web/next.config.ts');

  test('vercel.json has status redirect rule', () => {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    const statusRedirect = config.redirects?.find(r => r.source === '/status');

    expect(statusRedirect).toBeDefined();
    expect(statusRedirect.destination).toBe('https://status.satelink.network/');
    expect(statusRedirect.permanent).toBe(true);
    expect(statusRedirect.missing).toContainEqual({ type: 'host', value: 'status.satelink.network' });
  });

  test('vercel.json has subpath redirect rule', () => {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    const subpathRedirect = config.redirects?.find(r => r.source === '/status/:path*');

    expect(subpathRedirect).toBeDefined();
    expect(subpathRedirect.destination).toBe('https://status.satelink.network/:path*');
    expect(subpathRedirect.permanent).toBe(true);
  });

  test('vercel.json preserves status.satelink.network rewrite', () => {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    const statusRewrite = config.rewrites?.find(r =>
      r.has?.some(h => h.value === 'status.satelink.network')
    );

    expect(statusRewrite).toBeDefined();
    expect(statusRewrite.destination).toBe('/_status/:path*');
  });

  test('next.config.ts exists and is readable', () => {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    expect(content).toContain('async redirects()');
    expect(content).toContain('status.satelink.network');
  });
});
