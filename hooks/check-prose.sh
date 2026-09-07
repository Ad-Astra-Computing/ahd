#!/usr/bin/env bash
# Refuse staged prose that carries the patterns people read as machine-written.
#
# Scope is deliberately narrow: markdown only, and only the tells that are
# unambiguous in a technical document. A prose check that argues with the writer
# gets bypassed, and a bypassed check is worse than none. The tell patterns live
# in lib-tells.sh, shared with the commit-message hook so the two never drift.
#
# NOT flagged, because each is correct usage that a blunt rule would break:
#   - an en dash inside a range (U+D800-U+DBFF, sections 3-4)
#   - "harness" as a noun, meaning a test harness
#   - a bold term in a definition list when the term is a real identifier
#   - the guard toolkit under hooks/ itself, which stores the tell patterns
#     as data and carries long explanatory headers; scanning it cries wolf
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$HERE/lib-tells.sh"

EVAL_DATA='(^|/)tools/eval/(fixtures|cache|results|review)/'
staged=$(git diff --cached --name-only --diff-filter=ACM -- '*.md' '*.mdx' \
  | grep -vE "$EVAL_DATA" || true)
staged_code=$(git diff --cached --name-only --diff-filter=ACM \
  | grep -vE '\.(md|mdx|lock|sum|min\.js|map)$' \
  | grep -vE '(^|/)(vendor|node_modules|dist|third_party|hooks|\.git)/' \
  | grep -vE "$EVAL_DATA" || true)
[ -z "$staged" ] && [ -z "$staged_code" ] && exit 0

bad=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  # Only look at lines this commit adds, so an old file does not block work
  # unrelated to it.
  added=$(git diff --cached -U0 -- "$f" | grep '^+' | grep -v '^+++' | sed 's/^+//')
  [ -z "$added" ] && continue
  if hits=$(scan_tells "$added"); then
    printf '%s:\n%s\n' "$f" "$hits"
    bad=1
  fi
done <<< "$staged"

while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue
  comments=$(git diff --cached -U0 -- "$f" | python3 -c '
import re, sys
out = []
for line in sys.stdin:
    if not line.startswith("+") or line.startswith("+++"):
        continue
    m = re.match(r"^\+\s*(?:#+|//+|--+|;+)\s?(.*)$", line.rstrip("\n"))
    if m:
        out.append(m.group(1))
print("\n".join(out))
')
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "check-prose: comment scan of $f failed; refusing to report a false pass" >&2
    bad=1
    continue
  fi
  [ -z "$comments" ] && continue
  if hits=$(scan_tells "$comments"); then
    printf '%s (comments):\n%s\n' "$f" "$hits"
    bad=1
  fi
  run=$(git diff --cached -U0 -- "$f" | python3 -c '
import re, sys
best = cur = 0
for line in sys.stdin:
    if line.startswith("+++") or not line.startswith("+"):
        cur = 0
        continue
    if re.match(r"^\+\s*(?:#+|//+|--+|;+)", line):
        cur += 1
        best = max(best, cur)
    else:
        cur = 0
print(best)
')
  if [ "${run:-0}" -gt 6 ]; then
    printf '%s: %s-line comment block\n' "$f" "$run"
    bad=1
  fi
done <<< "$staged_code"

if [ "$bad" -ne 0 ]; then
  cat <<'MSG'

Commit refused by the prose check. These are the patterns readers use to spot
machine-written text, and the owner has flagged them repeatedly.

A long comment block is the other tell: if the WHY genuinely needs that much
room it belongs in the commit message.

If a hit is genuinely correct usage, commit with --no-verify and say why in the
message, so the exception is on the record rather than silent.
MSG
  exit 1
fi
exit 0
