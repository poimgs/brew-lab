#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ $# -lt 2 ]; then
    echo "Usage: ./scripts/create-user.sh -email=user@example.com -password=SecurePass123!"
    exit 1
fi

docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec backend ./cli "$@"
