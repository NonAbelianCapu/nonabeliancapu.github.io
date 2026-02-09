#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/local-ruby-env.sh"

cd "${SCRIPT_DIR}/.."
bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload "$@"
