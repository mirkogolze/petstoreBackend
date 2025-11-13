.PHONY: help build up down restart logs clean test prisma-migrate prisma-studio health

# Default target
help:
	@echo "Petstore API - Docker Commands"
	@echo "=============================="
	@echo "  make build          - Build Docker images"
	@echo "  make up             - Start all services"
	@echo "  make up-dev         - Start all services in development mode"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs (all services)"
	@echo "  make logs-api       - View API logs only"
	@echo "  make logs-db        - View database logs only"
	@echo "  make shell-api      - Open shell in API container"
	@echo "  make shell-db       - Open PostgreSQL shell"
	@echo "  make clean          - Stop and remove all containers, networks, volumes"
	@echo "  make test           - Run tests in container"
	@echo "  make prisma-migrate - Run Prisma migrations"
	@echo "  make prisma-studio  - Open Prisma Studio"
	@echo "  make health         - Check service health"
	@echo "  make scan           - Scan images for vulnerabilities"

# Build Docker images
build:
	docker compose build

# Start services in production mode
up:
	docker compose up -d

# Start services in development mode
up-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop services
down:
	docker compose down

# Restart services
restart:
	docker compose restart

# View logs
logs:
	docker compose logs -f

# View API logs
logs-api:
	docker compose logs -f api

# View database logs
logs-db:
	docker compose logs -f postgres

# Open shell in API container
shell-api:
	docker compose exec api sh

# Open PostgreSQL shell
shell-db:
	docker compose exec postgres psql -U petstore -d petstore

# Clean up everything
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# Run tests
test:
	docker compose exec api npm test

# Run Prisma migrations
prisma-migrate:
	docker compose exec api npx prisma migrate deploy

# Open Prisma Studio
prisma-studio:
	docker compose exec api npx prisma studio

# Check health
health:
	@echo "Checking API health..."
	@curl -f http://localhost:13000/health || echo "API is not healthy"
	@echo ""
	@echo "Checking database..."
	@docker compose exec postgres pg_isready -U petstore || echo "Database is not ready"

# Security scan with Docker Scout
scan:
	@echo "Scanning API image..."
	docker scout cves petstore-api || true
	@echo ""
	@echo "Scanning PostgreSQL image..."
	docker scout cves postgres:16-alpine || true

# Backup database
backup:
	@mkdir -p backups
	docker compose exec -T postgres pg_dump -U petstore petstore | gzip > backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup created in backups/"

# Restore database
restore:
	@echo "Enter backup filename (e.g., backup-20250121-120000.sql.gz):"
	@read backup; \
	gunzip -c backups/$$backup | docker compose exec -T postgres psql -U petstore petstore
