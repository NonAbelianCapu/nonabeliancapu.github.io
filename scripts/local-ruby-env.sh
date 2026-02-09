#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/.local/jekyll-toolchain"
RUBY_PREFIX="${ROOT}/ruby-3.2.6"

export PATH="${RUBY_PREFIX}/bin:${PATH}"
export LD_LIBRARY_PATH="${ROOT}/opt/openssl/lib64:${ROOT}/opt/openssl/lib:${ROOT}/opt/zlib/lib:${ROOT}/opt/libyaml/lib:${LD_LIBRARY_PATH:-}"
export SSL_CERT_FILE="${SSL_CERT_FILE:-/etc/ssl/certs/ca-certificates.crt}"
