# Local Development Guide

This guide explains how to set up and run the Satelink platform locally for development.

## Prerequisites

-   **Node.js**: Version 20 or higher (managed by `.nvmrc`).
-   **Docker**: Docker Desktop or Docker Engine with Docker Compose.
-   **Make**: Standard build automation tool.

## Quick Start

To start the entire platform with one command:

```bash
make dev
```

This command will:
1.  Run the `scripts/dev-setup.sh` script to install dependencies and create your `.env` file.
2.  Build and start the Docker containers in the background.

## Service Endpoints

Once running, the following services are available:

-   **Backend API**: [http://localhost:8080](http://localhost:8080)
-   **Dashboard**: [http://localhost:3000](http://localhost:3000)
-   **PostgreSQL**: `localhost:5432` (User/Pass/DB: `satelink`)
-   **Redis**: `localhost:6379`

## Common Commands

Manage your development environment using the following `make` commands:

-   `make logs`: Stream logs from all services to your terminal.
-   `make stop`: Stop all services without removing containers.
-   `make restart`: Restart the services.
-   `make clean`: Stop services and remove containers, volumes, and cached images.

## Troubleshooting

### Docker Not Running
If you see an error about Docker, ensure the Docker Desktop application is open and running on your machine.

### Port Conflicts
If ports 8080, 3000, 5432, or 6379 are already in use, `make dev` will fail. Stop any other local services using these ports and try again.

### Slow Startup
The first time you run `make dev`, it will take several minutes to pull the base images and build the containers. Subsequent starts will be much faster.
