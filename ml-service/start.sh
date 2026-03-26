#!/usr/bin/env bash
# Run Flask ML service on PORT (default 6001). Prefer project venv if present.
set -e
cd "$(dirname "$0")"
PY="${ML_PYTHON:-}"
if [ -z "$PY" ] && [ -x venv/bin/python ]; then PY=venv/bin/python; fi
if [ -z "$PY" ]; then PY=python3; fi
exec "$PY" app.py
