#!/usr/bin/env bash
# Start Vite dev server on port 3000. Run from project root or from frontend.
set -e
cd "$(dirname "$0")"
exec npm run dev
