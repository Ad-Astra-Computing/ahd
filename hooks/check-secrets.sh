#!/usr/bin/env bash
# Refuse staged content that looks like a live credential.
#
# Prefers gitleaks when it is on PATH (full ruleset + the repo's own
# .gitleaks.toml allowlist). Falls back to a tight, high-signal regex scan when
# gitleaks is absent, which is the case in fresh sandboxes, exactly where the
# .pre-commit-config.yaml gitleaks hook silently does nothing. The fallback is
# deliberately narrow: it matches credential SHAPES that are almost never
# legitimate in source, not generic high-entropy strings (this repo is full of
# commit SHAs and checksums that a broad entropy rule would false-flag).
set -uo pipefail

# --- prefer gitleaks -------------------------------------------------------
if command -v gitleaks >/dev/null 2>&1; then
  # protect --staged scans the index; --redact keeps secrets out of the log.
  if gitleaks protect --staged --redact --no-banner >/dev/null 2>&1; then
    exit 0
  fi
  echo "gitleaks flagged a staged secret:"
  gitleaks protect --staged --redact --no-banner 2>&1 | grep -iE 'finding|secret|rule|file|line' | head -20
  echo
  echo "Commit refused. Remove the secret; if it is a false positive, add it to .gitleaks.toml."
  exit 1
fi

# --- regex fallback --------------------------------------------------------
# Path allowlist, kept aligned with .gitleaks.toml so the fallback and gitleaks
# agree on what is example data rather than a secret.
skip_path() {
  case "$1" in
    testdata/*|*/testdata/*) return 0 ;;
    fixtures/*|*/fixtures/*) return 0 ;;
    *.example) return 0 ;;
  esac
  return 1
}

# High-signal credential shapes. Each is a real provider format or an explicit
# assignment of a long opaque value to a secret-named field.
PATTERNS=(
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'          # PEM private keys
  'AKIA[0-9A-Z]{16}'                             # AWS access key id
  'ASIA[0-9A-Z]{16}'                             # AWS temp access key id
  'sk-ant-[A-Za-z0-9_-]{20,}'                    # Anthropic API key
  'sk-[A-Za-z0-9]{32,}'                          # OpenAI-style key
  'gh[pousr]_[A-Za-z0-9]{30,}'                   # GitHub tokens
  'xox[baprs]-[A-Za-z0-9-]{10,}'                 # Slack tokens
  'AIza[0-9A-Za-z_-]{35}'                        # Google API key
  'glpat-[A-Za-z0-9_-]{20,}'                     # GitLab PAT
  '(api[_-]?key|secret|token|password|passwd|access[_-]?key)["'"'"' ]*[:=]["'"'"' ]*[A-Za-z0-9+/_-]{20,}'
)

staged=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$staged" ] && exit 0

bad=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  skip_path "$f" && continue
  # Only scan lines this commit ADDS.
  added=$(git diff --cached -U0 -- "$f" | grep '^+' | grep -v '^+++')
  [ -z "$added" ] && continue
  for pat in "${PATTERNS[@]}"; do
    # `--` so a pattern that begins with '-' (the PEM header) is not read as a
    # grep option; without it, private-key detection silently matches nothing.
    if hit=$(printf '%s\n' "$added" | grep -iE -- "$pat" | head -1); then
      # Redact the matched value in the report.
      echo "possible secret in $f (pattern: ${pat:0:28}...)"
      bad=1
      break
    fi
  done
done <<< "$staged"

if [ "$bad" -ne 0 ]; then
  cat <<'MSG'

Commit refused by the secret scan (gitleaks not installed; regex fallback).
Remove the credential. If it is a false positive, install gitleaks and add an
allowlist entry, or commit with --no-verify after confirming it is not a secret.
MSG
  exit 1
fi
exit 0
