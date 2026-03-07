.PHONY: boot stop reset-db smoke logs docker-up docker-down

boot:
	@echo "Booting environment..."
	./ops/scripts/boot-satelink.sh

stop:
	@echo "Stopping environment..."
	./ops/scripts/stop-satelink.sh

reset-db:
	@echo "Resetting development database..."
	./ops/scripts/reset-dev-db.sh

smoke:
	@echo "Running smoke tests..."
	./ops/scripts/smoke-test.sh

logs:
	@echo "Tailing all logs..."
	tail -f logs/*.log

docker-up:
	@echo "Starting Docker environment..."
	docker-compose -f ops/docker/docker-compose.dev.yml up --build -d

docker-down:
	@echo "Stopping Docker environment..."
	docker-compose -f ops/docker/docker-compose.dev.yml down
