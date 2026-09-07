#!/usr/bin/env bash
# Install the adastra hooks into one or more repos.
#
#   pre-commit : check-invisible (watermarks/bidi) -> check-prose (AI tells in
#                markdown) -> check-secrets (gitleaks or regex fallback) ->
#                check-stray (scratch files, conflict markers)
#   commit-msg : check-commit-msg (AI tells + changelog-essay + co-author tags)
#
# If a repo's hooks are disabled by a non-standard core.hooksPath (fresh
# sandboxes set core.hooksPath=/var/empty in /etc/gitconfig, which silently
# disables EVERY repo hook), this sets a LOCAL core.hooksPath back to the repo's
# own hooks dir so the hooks actually run. Local config wins over system.
set -uo pipefail
D="${ADASTRA_HOOKS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
INVIS="$D/check-invisible.sh"
PROSE="$D/check-prose.sh"
SECRETS="$D/check-secrets.sh"
STRAY="$D/check-stray.sh"
MSG="$D/check-commit-msg.sh"

for repo in "$@"; do
  gd=$(cd "$repo" && git rev-parse --git-dir 2>/dev/null) || { echo "skip (not a repo): $repo"; continue; }
  gd=$(cd "$repo" && cd "$gd" && pwd)
  mkdir -p "$gd/hooks"

  # pre-commit (chain any pre-existing non-adastra hook).
  target="$gd/hooks/pre-commit"
  if [ -f "$target" ] && ! grep -q 'adastra-hooks' "$target"; then
    echo "  NOTE: $repo already had a pre-commit hook; chaining it"
    mv "$target" "$gd/hooks/pre-commit.local"
    printf '#!/usr/bin/env bash\n# adastra-hooks\n"%s" || exit 1\n"%s" || exit 1\n"%s" || exit 1\n"%s" || exit 1\nexec "%s/hooks/pre-commit.local"\n' \
      "$INVIS" "$PROSE" "$SECRETS" "$STRAY" "$gd" > "$target"
  else
    printf '#!/usr/bin/env bash\n# adastra-hooks\n"%s" || exit 1\n"%s" || exit 1\n"%s" || exit 1\nexec "%s"\n' \
      "$INVIS" "$PROSE" "$SECRETS" "$STRAY" > "$target"
  fi
  chmod +x "$target"

  # commit-msg.
  cmsg="$gd/hooks/commit-msg"
  if [ -f "$cmsg" ] && ! grep -q 'adastra-hooks' "$cmsg"; then
    echo "  NOTE: $repo already had a commit-msg hook; chaining it"
    mv "$cmsg" "$gd/hooks/commit-msg.local"
    printf '#!/usr/bin/env bash\n# adastra-hooks\n"%s" "$1" || exit 1\nexec "%s/hooks/commit-msg.local" "$1"\n' "$MSG" "$gd" > "$cmsg"
  else
    printf '#!/usr/bin/env bash\n# adastra-hooks\nexec "%s" "$1"\n' "$MSG" > "$cmsg"
  fi
  chmod +x "$cmsg"

  # Re-enable hooks if a non-standard hooksPath has disabled them.
  hp=$(cd "$repo" && git config --get core.hooksPath || true)
  if [ -n "$hp" ] && [ "$hp" != "$gd/hooks" ]; then
    (cd "$repo" && git config --local core.hooksPath "$gd/hooks")
    echo "  re-enabled hooks: set local core.hooksPath (was '$hp')"
  fi

  echo "installed: $repo"
done
