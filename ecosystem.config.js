module.exports = {
    apps: [
        {
            name: 'satelink-api',
            script: 'server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 8080,
                // JWT_SECRET and others should be set in machine env or .env file
            },
            env_staging: {
                NODE_ENV: 'production', // Still production build/mode, but maybe different DB
                PORT: 8080
            }
        },
        {
            name: 'satelink-web',
            cwd: './web',
            script: 'npm',
            args: 'start', // Runs 'next start'
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
