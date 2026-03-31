#!/usr/bin/env bash
set -euo pipefail

echo "Starting services..."
docker-compose up -d

echo "Services started."
