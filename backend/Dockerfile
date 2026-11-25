FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/backend \
    TZ=America/Recife

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import os, urllib.request; port = os.environ.get('SORRIDENTE_PORT') or os.environ.get('PORT') or '8000'; urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=3)"

CMD ["sh", "-c", "exec python -m uvicorn sorridente.api.app:create_app --factory --host \"${SORRIDENTE_HOST:-0.0.0.0}\" --port \"${SORRIDENTE_PORT:-${PORT:-8000}}\""]
