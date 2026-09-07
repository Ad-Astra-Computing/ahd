#!/usr/bin/env bash
# Refuse staged files carrying invisible or direction-changing characters.
#
# The point is not tidiness. A bidi override makes source read one way to a
# human and execute another (Trojan Source, CVE-2021-42574), and a stray NUL or
# DEL turns a text file binary to every grep that follows.
#
# What is NOT banned, and why: U+200C and U+200D carry real meaning. ZWJ joins
# emoji sequences (the astronaut in tulpa's ink-site README is one) and ZWNJ is
# ordinary text in Persian, Arabic and Indic scripts. Banning them produces
# false positives on the first README with an emoji in it, and a check that
# cries wolf gets disabled. U+00A0 is likewise ordinary in prose.
set -uo pipefail
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# The Python RANGES below are the hard invisibles: ZWSP, invisible operators
# and word joiner, bidi overrides and isolates, soft hyphen and other
# default-ignorables, noncharacters, Hangul fillers, the tag block, C0 controls
# except tab, LF and CR, and DEL. Directional marks (LRM/RLM/ALM) are left out
# of the blocker to avoid false positives on real RTL text. The loop also runs
# strip-watermarks.py --check on each file, so anything the stripper removes,
# such as a variation-selector smuggling run, is refused here too.

SCAN=$(command -v python3 || true)
if [ -z "$SCAN" ]; then
  echo "check-invisible: python3 not found; refusing to report a false pass" >&2
  exit 2
fi

scan_file() {
  python3 - "$1" <<'PYEOF'
import sys
RANGES = [(0x200B,0x200B),(0x00AD,0x00AD),(0x2060,0x2065),(0x180E,0x180E),
          (0x3164,0x3164),(0xFFA0,0xFFA0),(0xFFF0,0xFFF8),(0x202A,0x202E),
          (0x2066,0x2069),(0xFDD0,0xFDEF),(0xFFFE,0xFFFF),(0xE0000,0xE007F),
          (0x0000,0x0008),(0x000B,0x000C),(0x000E,0x001F),(0x007F,0x007F)]
def banned(ch):
    o = ord(ch)
    return any(lo <= o <= hi for lo, hi in RANGES)
try:
    with open(sys.argv[1], encoding="utf-8", errors="strict") as fh:
        lines = fh.readlines()
except (UnicodeDecodeError, OSError):
    sys.exit(3)
found = False
for n, line in enumerate(lines, 1):
    if any(banned(c) for c in line):
        print(f"{n}:{line.rstrip()}")
        found = True
sys.exit(0 if found else 1)
PYEOF
}

staged=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$staged" ] && exit 0

# Optional per-repo carve-out, one glob per line, at .git/hooks-invisible-allow.
# It lives in .git/ deliberately: an exemption should be a local, visible
# decision someone has to re-make, not a file that quietly travels with a clone.
ALLOW="$(git rev-parse --git-dir)/hooks-invisible-allow"
allowed() {
  [ -f "$ALLOW" ] || return 1
  while IFS= read -r pat; do
    case "$pat" in ""|\#*) continue ;; esac
    # shellcheck disable=SC2254
    case "$1" in $pat) return 0 ;; esac
  done < "$ALLOW"
  return 1
}

bad=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if allowed "$f"; then continue; fi
  # Binary files are exempt: the rule is about text that a human reads.
  git diff --cached --numstat -- "$f" | grep -q '^-' && continue
  hits=$(scan_file "$f" 2>&1)
  rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "invisible or bidi character in $f"
    echo "$hits" | head -3 | sed 's/^/    /' | cut -c1-160
    bad=1
  elif [ "$rc" -eq 3 ]; then
    :
  elif [ "$rc" -gt 1 ]; then
    echo "check-invisible: scan of $f failed: $hits" >&2
    bad=1
  fi
  # A BOM is only legitimate at byte zero, and not really even there.
  if [ "$(head -c3 -- "$f" | od -An -tx1 | tr -d ' \n')" = "efbbbf" ]; then
    echo "UTF-8 BOM at the start of $f"
    bad=1
  fi
  # Delegate the full covert-carrier set (variation selectors especially) to
  # the stripper, so a smuggling channel it would remove is refused here.
  if ! python3 "$HERE/strip-watermarks.py" --check "$f" >/dev/null 2>&1; then
    echo "covert-carrier character in $f; run strip-watermarks.py to clean it"
    bad=1
  fi
done <<< "$staged"

if [ "$bad" -ne 0 ]; then
  cat <<'MSG'

Commit refused. If a character here is deliberate, say so in the commit rather
than widening the rule: this hook is local and unversioned, so a silent
exemption would be invisible to everyone else.
MSG
  exit 1
fi
exit 0
