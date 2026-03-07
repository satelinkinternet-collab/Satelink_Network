export const logger = {
    info: (message, meta = {}) => log('INFO', message, meta),
    warn: (message, meta = {}) => log('WARN', message, meta),
    error: (message, meta = {}) => log('ERROR', message, meta),
    debug: (message, meta = {}) => log('DEBUG', message, meta)
};

function log(level, message, meta) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || 'unknown',
        message,
        ...meta
    };

    // If we're strictly in production, we output raw strings/JSON safely
    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(payload));
    } else {
        // Development is cleanly formatted
        const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
        console.log(`${color}[${payload.timestamp}] [${level}]${'\x1b[0m'} ${message}`, Object.keys(meta).length ? meta : '');
    }
}
