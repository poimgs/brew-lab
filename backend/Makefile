.PHONY: run build seed-user test clean migrate-up migrate-down migrate-create docker-up docker-down

# Load env vars if .env exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/coffee_tracker?sslmode=disable

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

seed-user:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then \
		echo "Usage: make seed-user EMAIL=user@example.com PASSWORD=SecurePass123!"; \
		exit 1; \
	fi
	go run cmd/seed/main.go -email=$(EMAIL) -password=$(PASSWORD)

test:
	go test -v ./...

clean:
	rm -rf bin/

# Docker commands
docker-up:
	docker-compose -f ../docker-compose.yml up -d

docker-down:
	docker-compose -f ../docker-compose.yml down

# Migration commands (requires golang-migrate CLI)
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down

migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# Development helpers
dev: docker-up
	@echo "Waiting for database..."
	@sleep 2
	$(MAKE) migrate-up
	$(MAKE) run

lint:
	golangci-lint run

fmt:
	go fmt ./...

tidy:
	go mod tidy
