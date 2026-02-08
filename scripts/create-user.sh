#!/bin/bash
set -euo pipefail

usage() {
  echo "Usage: $0 -email=<email> -password=<password>"
  exit 1
}

EMAIL=""
PASSWORD=""

for arg in "$@"; do
  case $arg in
    -email=*) EMAIL="${arg#*=}" ;;
    -password=*) PASSWORD="${arg#*=}" ;;
    *) usage ;;
  esac
done

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  usage
fi

docker compose -f docker-compose.prod.yml exec -e EMAIL="$EMAIL" -e PASSWORD="$PASSWORD" backend ./seed
