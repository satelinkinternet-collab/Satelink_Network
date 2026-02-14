module.exports = {
    apps: [
        {
            name: "satelink-api",
            script: "./server.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
                PORT: 8080,
            },
            env_staging: {
                NODE_ENV: "staging",
                PORT: 8080,
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 8080,
            }
        },
        {
            name: "satelink-web",
            cwd: "./web",
            script: "npm",
            args: "start",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "development",
                PORT: 3000,
            },
            env_staging: {
                NODE_ENV: "staging",
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 3000,
            }
        }
    ]
};
