#!/usr/bin/env bash
# PreToolUse guard for text that leaves the machine.
#
# The commit hooks only see commit messages and committed files. A pull request
# body, an issue, a review comment and a release note are written straight into
# a gh command, so nothing checked them, and that is how AI-sounding prose
# reached a public pull request. This closes that path.
set -uo pipefail
D="${ADASTRA_HOOKS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
# shellcheck source=/dev/null
source "$D/lib-tells.sh"

payload=$(cat)
body=$(printf '%s' "$payload" | python3 -c '
import json,shlex,sys,re,pathlib
try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    sys.exit(0)
if not re.search(r"\bgh\s+(pr|issue|release)\s+(create|edit|comment)\b", cmd):
    sys.exit(0)
# A heredoc body is written to a file first in practice; parse the flags we can.
try:
    parts = shlex.split(cmd, comments=False)
except ValueError:
    sys.exit(0)
out = []
for i, p in enumerate(parts):
    if p in ("--body", "-b", "--title", "-t") and i + 1 < len(parts):
        out.append(parts[i + 1])
    elif p == "--body-file" and i + 1 < len(parts):
        path = parts[i + 1]
        if path != "-":
            try:
                out.append(pathlib.Path(path).read_text(encoding="utf-8"))
            except OSError:
                pass
print("\n".join(out))
')

[ -z "${body//[[:space:]]/}" ] && exit 0

# Attribution trailers must never reach a PR, issue or release, the same rule
# the commit-message guard enforces. Catch the unambiguous forms.
trailer=$(printf '%s' "$body" | grep -iE 'co-authored-by:|generated with|claude-session:|🤖' | head -3)

report=$( { scan_tells "$body"; scan_shape "$body"; } 2>/dev/null )
if [ -n "$trailer" ]; then
  report=$(printf '%s\n  attribution trailer: %s' "$report" "$(printf '%s' "$trailer" | tr '\n' ' ')")
fi
[ -z "${report//[[:space:]]/}" ] && exit 0

{
  echo "Refusing to post this text: it reads as machine-written or carries an agent trailer."
  echo
  echo "$report"
  echo
  echo "Rewrite it and run the command again. Plain sentences, headings that"
  echo "are labels rather than beats, numbers stated rather than bolded. No"
  echo "co-author or generated-with trailers."
} >&2
exit 2
