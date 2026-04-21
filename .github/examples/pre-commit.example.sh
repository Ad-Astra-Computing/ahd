#!/usr/bin/env bash
# Example pre-commit hook for projects consuming AHD.
#
# Install: copy to .git/hooks/pre-commit and chmod +x,
# or with husky: npx husky add .husky/pre-commit "$(cat this file)"
#
# Lints staged *.html and *.css files through AHD. Exits non-zero if any
# error-severity rule fires.

set -euo pipefail

STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(html|css)$' || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

# shellcheck disable=SC2086
exec npx ahd lint $STAGED
