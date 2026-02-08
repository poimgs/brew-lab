.PHONY: build run tidy migrate migrate-down migrate-version seed-user test

build:
	go build -o bin/server ./cmd/server
	go build -o bin/seed ./cmd/seed

run:
	go run ./cmd/server

tidy:
	go mod tidy

migrate:
	go run ./cmd/server migrate-up

migrate-down:
	go run ./cmd/server migrate-down

migrate-version:
	go run ./cmd/server migrate-version

seed-user:
	EMAIL=$(EMAIL) PASSWORD=$(PASSWORD) go run ./cmd/seed

test:
	go test ./...
