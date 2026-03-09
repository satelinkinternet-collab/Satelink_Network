# Satelink Network - Developer Makefile

.PHONY: setup dev stop restart logs clean help

help:
	@echo "Available commands:"
	@echo "  make setup   - Prepare the local environment (install deps, create .env)"
	@echo "  make dev     - Start the full development stack in Docker"
	@echo "  make stop    - Stop all running services"
	@echo "  make restart - Restart the development stack"
	@echo "  make logs    - Stream logs from all services"
	@echo "  make clean   - Remove containers, volumes, and cached images"

setup:
	@bash scripts/dev-setup.sh

dev: setup
	docker compose -f infra/docker/docker-compose.dev.yml up --build -d
	@echo "Satelink is starting..."
	@echo "API: http://localhost:8080"
	@echo "Dashboard: http://localhost:3000"

stop:
	docker compose -f infra/docker/docker-compose.dev.yml stop

restart:
	docker compose -f infra/docker/docker-compose.dev.yml restart

logs:
	docker compose -f infra/docker/docker-compose.dev.yml logs -f

clean:
	docker compose -f infra/docker/docker-compose.dev.yml down -v --rmi local
