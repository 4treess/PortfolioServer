#!/bin/sh
set -eu

if [ ! -f .env ]; then
    printf 'Missing .env. Copy .env.example to .env and configure your credentials.\n' >&2
    exit 1
fi

if [ -x .venv/bin/uvicorn ]; then
    exec .venv/bin/uvicorn api:app --reload
fi

exec uvicorn api:app --reload