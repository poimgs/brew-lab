#!/bin/bash
set -e

if [ $# -lt 2 ]; then
    echo "Usage: ./scripts/create-user.sh -email=user@example.com -password=SecurePass123!"
    exit 1
fi

docker compose -f docker-compose.prod.yml exec backend ./cli "$@"
