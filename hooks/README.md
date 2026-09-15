# Hooks

The enforcement layer. AGENTS.md and STANDARD/ are guidance; these
guards make the hard rules hold at commit time and before text leaves
the machine. They are the source of truth for the tell patterns, so the
docs point here rather than restating the list.

## The guards

- `check-invisible.sh` (pre-commit): refuses staged files with invisible
  or bidi control characters, the Trojan Source class.
- `check-prose.sh` (pre-commit): refuses staged markdown and code-comment
  prose that carries the tells in `lib-tells.sh`.
- `check-secrets.sh` (pre-commit): runs gitleaks when present, otherwise
  a tight regex fallback, over staged changes.
- `check-stray.sh` (pre-commit): refuses scratch files and unresolved
  conflict markers.
- `check-commit-msg.sh` (commit-msg): checks subject length and shape,
  rejects co-author and generated-with trailers, and runs the tell scan.
- `check-outbound-text.sh` (Claude Code PreToolUse): scans the body and
  title of `gh pr | issue | release` commands and blocks a post that
  reads machine-written.
- `check-text.sh`: a standalone scanner for drafts that never hit a
  commit, such as an email or an application answer.
- `lib-tells.sh`: the shared pattern library the scanners source. It
  also holds the advisory layer, a serial comma and a contraction, which
  `check-prose.sh` and `check-text.sh` print without changing their exit
  code, since the patterns also match some correct prose.
- `comment-scan.py`: decides what counts as a line comment, for both
  jobs `check-prose.sh` does with comments. It picks markers by file
  type and requires whitespace after the marker, so a CSS custom
  property or an id selector is read as a value. Before it, eight
  `--token:` lines in a `:root` block read as an eight-line comment
  block and the commit was refused. `test-comment-scan.py` covers it.
- `strip-watermarks.py`, `paraphrase.py`: helpers for cleaning your own
  text. Paraphrase sends text off the machine only with an explicit
  flag and a secret scan first. `test-watermarks.py` and
  `test-paraphrase.py` cover them; CI runs both.

## Paraphrase

The paraphraser uses ordinary words and direct verbs while preserving facts,
qualifications and protected text. Checked local edits shorten phrases such
as `make use of` even when a model rewrite is rejected. Clean prose can stay
unchanged. Failed model rewrites are still reported. The meaning checks catch
specific errors but do not prove semantic equivalence or watermark removal.

## Install the hooks

Install the git hooks into a repo from its root:

```
./hooks/install.sh .
```

Wire the outbound-text guard into Claude Code by adding a PreToolUse
entry to your settings, pointing at this repo's copy:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "<repo>/hooks/check-outbound-text.sh",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

The scripts resolve their own directory, so they run from the repo copy
on any host. Set `ADASTRA_HOOKS_DIR` to override the location.

## Backlog

Known improvements, in rough priority order. None block use today.

- Match more outbound surfaces: release `--notes` and `--notes-file`,
  the `-F` body file, `gh gist` and `glab`. Catch heredoc bodies, which
  the command-line parse cannot see, by scanning at the point the body
  file is written.
- Add the co-author and generated-with trailer scan to the outbound and
  prose guards, not only the commit-message guard, so a trailer cannot
  reach a PR body or a changelog.
- Soften the commit-message length caps to warnings that scale with diff
  size, so a legitimately large commit is not blocked and the guard is
  not trained away.
- Tighten the generic secret pattern so example and placeholder values
  stop tripping it.
- Broaden the prose comment scan to C, HTML and Python docstring styles,
  and exempt recognized license headers from the long-comment rule.
- Package the toolkit as a Nix module so install is declarative and the
  hooks-path repair step becomes unnecessary.
- Add nix-specific stray checks: a committed `result` symlink, a
  `.direnv` directory, or a built store path.
- Add the jargon words that hide meaning in plain writing, such as
  "corpus", to the advisory layer next to the serial comma and the
  contraction. Advisory so it warns without crying wolf on a project
  that uses the word for real.
- Move check-secrets.sh off the deprecated `gitleaks protect --staged`
  to the current invocation, so a future gitleaks bump does not break it.

## Portability

The scripts target both macOS and Linux. Keep new pattern work inside
the Python the scanners already use rather than relying on GNU-only grep
behavior, since BSD grep handles word boundaries and the `-o` flag
differently.
