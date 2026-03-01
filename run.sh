#!/bin/bash
# Mismo que ./start-all.sh: arranca backend + frontend + ML en local.
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
exec ./start-all.sh
