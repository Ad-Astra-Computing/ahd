#!/usr/bin/env bash
# Check arbitrary draft text for the tells, outside git.
#
# check-prose.sh only sees staged markdown. That covers the repo but misses the
# text that actually gets sent to someone: an email, an application answer, a
# support reply. Those are drafted, pasted into a web form, and never touch a
# commit, so the tells ship unchecked. This runs the same shared library over
# any file or stdin, so a draft can be checked before it goes out.
#
# It reports and exits 1; it does not rewrite. Wording is a judgement call and
# the right fix depends on what the sentence is doing, so this names the hit and
# leaves the sentence alone. Invisible carriers are mechanical by contrast, so
# those are delegated to strip-watermarks.py, which can fix them in place.
#
# Usage:
#   check-text.sh draft.md [more.txt ...]
#   pbpaste | check-text.sh --stdin
set -uo pipefail

# Resolve through symlinks: this is meant to be linked onto PATH, and taking the
# link's own directory would look for lib-tells.sh in ~/.local/bin, fail to
# source it, and then report every draft "clean". A checker that silently passes
# everything is worse than no checker, so the sourcing is verified below.
SELF=${BASH_SOURCE[0]}
while [ -L "$SELF" ]; do
  target=$(readlink "$SELF")
  case $target in
    /*) SELF=$target ;;
    *) SELF=$(dirname "$SELF")/$target ;;
  esac
done
HERE=$(cd "$(dirname "$SELF")" && pwd)
# shellcheck source=/dev/null
. "$HERE/lib-tells.sh" 2>/dev/null
command -v scan_tells >/dev/null || {
  echo "check-text: cannot source lib-tells.sh from $HERE; refusing to report a false pass" >&2
  exit 2
}

STRIPPER="$HERE/strip-watermarks.py"

usage() { sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 2; }
[ $# -eq 0 ] && usage

bad=0
advised=0

# report <label> <text>
report() {
  local label=$1 text=$2 hits
  if hits=$(scan_tells "$text"); then
    printf '%s:\n%s\n' "$label" "$hits"
    bad=1
  fi
  if hits=$(scan_advisory "$text"); then
    printf '%s (advisory):\n%s\n' "$label" "$hits"
    advised=1
  fi
}

if [ "$1" = "--stdin" ]; then
  text=$(cat)
  report "(stdin)" "$text"
  # Same content through the stripper's check mode, via a temp file so the
  # single implementation of "what counts as invisible" stays in one place.
  if [ -x "$STRIPPER" ]; then
    tmp=$(mktemp) && printf '%s' "$text" > "$tmp"
    "$STRIPPER" --check "$tmp" >/dev/null 2>&1 || {
      echo "  invisible characters present; pipe through strip-watermarks.py --stdin"
      bad=1
    }
    rm -f "$tmp"
  fi
else
  for f in "$@"; do
    [ -f "$f" ] || { echo "no such file: $f" >&2; bad=1; continue; }
    report "$f" "$(cat "$f")"
    if [ -x "$STRIPPER" ] && ! "$STRIPPER" --check "$f" >/dev/null 2>&1; then
      echo "  invisible characters present; run: strip-watermarks.py \"$f\""
      bad=1
    fi
  done
fi

if [ "$bad" -ne 0 ]; then
  echo
  echo "Rewrite the flagged spans before sending."
  exit 1
fi
if [ "$advised" -ne 0 ]; then
  echo "clean, with advisories to review"
else
  echo "clean"
fi
exit 0
