#!/usr/bin/env bash
# Refuse a commit that carries scratch files or unresolved conflict markers.
#
# Both are mechanical mistakes with no legitimate form, which is the bar for a
# hook: a check that fires on correct work teaches people to pass --no-verify,
# and then it protects nothing.
#
# The scratch case is not hypothetical. A file written to verify that the SECRETS
# hook worked (containing a credential the secret scanner deliberately allowlists,
# so that hook passed it by design) was swept in by `git add -A` and reached a pull
# request. Reviewers scoped to the feature files did not see it either.
set -uo pipefail

fail=0

# Only newly ADDED files: renaming or editing an existing file that happens to
# match one of these names is the repo's business, not this hook's.
added=$(git diff --cached --name-only --diff-filter=A)

while IFS= read -r f; do
  [ -z "$f" ] && continue
  base=${f##*/}
  case "$base" in
    # Editor and merge leftovers. Flagged whatever the extension.
    *.orig|*.rej|*.bak|*~|*.swp)
      echo "$f: editor or merge leftover" ; fail=1 ; continue ;;
  esac
  # A scratch NAME only counts against a scratch EXTENSION. `probe-runner.test.ts`
  # and `src/tmpfile.ts` are ordinary source; `leak-probe.txt` is not. Checking
  # the name alone blocked a real test file the first time this ran, and a hook
  # that fires on correct work is one people learn to bypass.
  case "$base" in
    *.txt|*.log|*.out|*.tmp|*.dat|*.bin)
      case "$base" in
        scratch*|probe*|*-probe.*|*_probe.*|tmp*|temp*|foo*|bar*|test.txt|out.txt|debug*)
          echo "$f: looks like a scratch file" ; fail=1 ; continue ;;
      esac ;;
  esac
  # A .txt/.log/.json dropped at the repo ROOT is nearly always scratch; real
  # root files (README.md, LICENSE, package.json, flake.lock) are established
  # and rarely NEW, which is why this only looks at added files.
  case "$f" in
    */*) : ;;
    *.txt|*.log|*.out|*.tmp)
      echo "$f: new loose file at the repo root" ; fail=1 ;;
  esac
done <<< "$added"

# Unresolved conflict markers in anything staged. A hand-resolved conflict that
# leaves one marker behind produces a file that often still parses.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # Match at line start with the exact marker width, so ======= in a Markdown
  # underline or ellipsis art does not trip it. Check the STAGED blob, not the
  # working tree.
  if git show ":$f" 2>/dev/null | grep -qE '^(<{7}|>{7})( |$)'; then
    echo "$f: unresolved conflict marker"
    fail=1
  fi
done <<< "$(git diff --cached --name-only --diff-filter=ACM)"

if [ "$fail" -ne 0 ]; then
  cat >&2 <<'EOF'

Commit refused: scratch files or conflict markers are staged.

Remove them (git rm --cached <file>), or if the file genuinely belongs in the
repo, rename it to say what it is. Pass --no-verify only with a reason in the
message.
EOF
  exit 1
fi
exit 0
