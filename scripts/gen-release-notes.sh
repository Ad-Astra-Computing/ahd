#!/usr/bin/env bash
# Generate release notes from commit history between two git refs.
#
# Usage:
#   scripts/gen-release-notes.sh <from-ref> <to-ref>
#
# Example:
#   scripts/gen-release-notes.sh v0.7.11 v0.7.12
#   scripts/gen-release-notes.sh v0.7.12 HEAD
#
# Output: markdown. Commits grouped by Conventional-Commit type.
# Written to stdout so callers can pipe into `gh release create
# --notes-file -`, prepend to CHANGELOG.md, or capture for later.
#
# Designed to be stable across releases: the output is deterministic
# for a given commit range, so re-running on the same range produces
# byte-identical notes.

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <from-ref> <to-ref>" >&2
  exit 2
fi

FROM="$1"
TO="$2"

# Resolve the repo URL once up-front so commit hashes become
# clickable links in both the GitHub Release body and on the npm
# package page (when rendered through npmjs.com's markdown).
# Short hashes alone only auto-linkify inside the repo's own
# GitHub UI; explicit links work everywhere markdown renders.
REPO_URL=$(git config remote.origin.url 2>/dev/null \
  | sed -E 's|.*github\.com[:/]([^/]+/[^.]+)(\.git)?|https://github.com/\1|' \
  | head -1 || true)

# subject|short-hash per commit in the range.
LOG=$(git log --pretty=format:'%s|%h' "$FROM..$TO")

emit_group() {
  local label="$1"; shift
  local patterns=("$@")
  local expr=""
  local p
  for p in "${patterns[@]}"; do
    [ -n "$expr" ] && expr="$expr|"
    expr="$expr^${p}"
  done
  local lines
  # grep can return non-zero on no-match; swallow that explicitly.
  lines=$(echo "$LOG" | grep -E "$expr" \
    | awk -F'|' -v repo="$REPO_URL" '{
        if (repo != "") {
          printf "- %s ([%s](%s/commit/%s))\n", $1, $2, repo, $2
        } else {
          printf "- %s (%s)\n", $1, $2
        }
      }' || true)
  if [ -n "$lines" ]; then
    printf "### %s\n\n%s\n\n" "$label" "$lines"
  fi
}

emit_group "Features"      'feat:' 'feat\(' 'feat!'
emit_group "Fixes"         'fix:'  'fix\('  'fix!'
emit_group "Performance"   'perf:' 'perf\('
emit_group "CI / tooling"  'ci:'   'ci\('
emit_group "Documentation" 'docs:' 'docs\('
emit_group "Refactoring"   'refactor:' 'refactor\('
emit_group "Tests"         'test:' 'test\('
emit_group "Chores"        'chore:' 'chore\('

# Anything that didn't match a conventional prefix. Surfaced so maintainers
# notice and reformat next time; nothing is silently dropped.
REST=$(echo "$LOG" | grep -vE '^(feat|fix|perf|ci|docs|refactor|test|chore)(:|\()' \
  | awk -F'|' -v repo="$REPO_URL" 'NF>0 {
      if (repo != "") {
        printf "- %s ([%s](%s/commit/%s))\n", $1, $2, repo, $2
      } else {
        printf "- %s (%s)\n", $1, $2
      }
    }' || true)
if [ -n "$REST" ]; then
  printf "### Other\n\n%s\n\n" "$REST"
fi

if [[ "$REPO_URL" == https://github.com/* ]]; then
  printf "**Full changelog:** %s/compare/%s...%s\n" "$REPO_URL" "$FROM" "$TO"
fi
