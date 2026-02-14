import { getActiveAddress } from './embeddedWallet';

/**
 * Phase H4 — Support Bundle Generation
 * Creates a sanitized diagnostic bundle for debugging.
 */

export async function generateSupportBundle(message: string) {
    const address = await getActiveAddress();

    // Get last session trace from sessionStorage (if we were storing it)
    // For now, we mock some recent error contexts
    const recentErrors = JSON.parse(sessionStorage.getItem('satelink_error_log') || '[]');

    const bundle = {
        app_version: '1.0.0-mvp',
        timestamp: Date.now(),
        user_wallet: address,
        message: message.slice(0, 500),
        browser: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
        },
        network: {
            online: navigator.onLine,
            effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
        },
        system: {
            localStorage_keys: Object.keys(localStorage).filter(k => !k.includes('key')), // sanitized
            sessionStorage_keys: Object.keys(sessionStorage),
        },
        diagnostics: {
            recent_errors: recentErrors.slice(-5),
            wallet_initialized: !!address,
        },
        // NO private keys, NO secrets, NO full cookies
    };

    return bundle;
}

/**
 * Helper to log errors for support bundle
 */
export function logDiagnosticError(error: any) {
    try {
        const logs = JSON.parse(sessionStorage.getItem('satelink_error_log') || '[]');
        logs.push({
            t: Date.now(),
            m: error.message || String(error),
            s: error.stack?.split('\n').slice(0, 3).join(' ') // small snippet
        });
        sessionStorage.setItem('satelink_error_log', JSON.stringify(logs.slice(-20)));
    } catch (e) { }
}
