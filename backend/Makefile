.PHONY: build run tidy migrate migrate-down migrate-version seed-user

build:
	go build -o bin/server ./cmd/server
	go build -o bin/cli ./cmd/cli
	go build -o bin/migrate ./cmd/migrate

run:
	go run ./cmd/server

tidy:
	go mod tidy

migrate:
	go run ./cmd/migrate -cmd=up

migrate-down:
	go run ./cmd/migrate -cmd=down

migrate-version:
	go run ./cmd/migrate -cmd=version

seed-user:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then \
		echo "Usage: make seed-user EMAIL=user@example.com PASSWORD=SecurePass123!"; \
		exit 1; \
	fi
	go run ./cmd/cli -email="$(EMAIL)" -password="$(PASSWORD)"
