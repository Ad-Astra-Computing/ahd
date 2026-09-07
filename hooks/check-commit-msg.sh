#!/usr/bin/env bash
# commit-msg hook: refuse commit messages that read as machine-written.
#
# A commit message is prose the owner reads later, and the changelog-essay
# register (long body, "This commit ...", em dashes, marketing verbs) is the
# same class of tell as over-explained web copy. This is the message-side
# companion to check-prose.sh.
#
# Invoked by git as: check-commit-msg.sh <path-to-COMMIT_EDITMSG>
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$HERE/lib-tells.sh"

msg_file=${1:?commit-msg hook needs the message file path}
[ -f "$msg_file" ] || exit 0

# The message minus comment lines and any verbose-commit diff (everything from
# the scissors line down is not part of the message).
body=$(sed '/^# ------------------------ >8 ------------------------$/,$d' "$msg_file" \
  | grep -v '^#')
[ -z "${body//[[:space:]]/}" ] && exit 0

subject=$(printf '%s\n' "$body" | sed '/^[[:space:]]*$/d' | head -1)

bad=0
note() { printf '  %s\n' "$1"; bad=1; }

# --- structural tells ------------------------------------------------------
case "$subject" in
  *.) note "subject ends with a period; drop it" ;;
esac
if [ "${#subject}" -gt 72 ]; then
  note "subject is ${#subject} chars; keep it under ~50 (72 hard max)"
fi
case "$subject" in
  "This commit"*|"This change"*|"This PR"*|"In this commit"*|"In this change"*|"Fixed "*|"Added "*|"Updated "*|"Changed "*)
    note "subject reads like a changelog essay / past tense; use a short imperative (\"fix X\", not \"Fixed X\")" ;;
esac

# Body length: a wall of bullets or paragraphs on a routine commit is a tell.
body_lines=$(printf '%s\n' "$body" | sed '1,2d' | grep -c .)
[ "$body_lines" -gt 15 ] && note "commit body is $body_lines non-blank lines; keep it to a short paragraph or a few bullets"

# --- watermarks the owner never wants --------------------------------------
if printf '%s\n' "$body" | grep -qiE '^\s*co-authored-by:'; then
  note "Co-Authored-By trailer; the owner does not want co-author tags"
fi
if printf '%s\n' "$body" | grep -qiE 'generated with|🤖|made with claude|written by (claude|an ai|gpt)'; then
  note "AI-attribution / generated-with watermark line"
fi

# --- shared prose tells (em dash, filler, marketing verbs) -----------------
if tell_hits=$(scan_tells "$body"); then
  printf '%s\n' "$tell_hits"
  bad=1
fi

if [ "$bad" -ne 0 ]; then
  cat <<'MSG'

Commit message refused. These are the patterns that read as machine-written,
and the owner has flagged them repeatedly. Rewrite the message.

If a hit is genuinely correct, commit with --no-verify and say why.
MSG
  exit 1
fi
exit 0
