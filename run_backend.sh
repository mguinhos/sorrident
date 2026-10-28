#!/usr/bin/env bash
# Sobe a API do SorriDente (FastAPI + bot do Telegram) usando o .venv local.
set -e
cd "$(dirname "$0")"

# Mata qualquer instância anterior do backend antes de subir de novo
pkill -f "uvicorn sorridente.api.app" 2>/dev/null || true

export PYTHONPATH="$PWD/backend"
exec .venv/bin/python -m uvicorn sorridente.api.app:create_app --factory \
  --host "${SORRIDENTE_HOST:-0.0.0.0}" --port "${SORRIDENTE_PORT:-8000}" "$@"
