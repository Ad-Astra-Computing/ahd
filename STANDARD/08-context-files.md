# Context files

The files that instruct agents, meaning AGENTS.md, CLAUDE.md, skills and
hooks, are loaded on every request. Every line is a cost paid each time.
Keep the surface small, versioned and current.

## One source of truth

AGENTS.md is the canonical instruction file. Codex reads it natively and
it is the cross-tool standard. Claude Code reads CLAUDE.md, not AGENTS.md,
so CLAUDE.md imports AGENTS.md to load the canonical file. The first line
of CLAUDE.md is `@AGENTS.md`, and anything below is Claude-specific and
nothing else. That import is the whole reason CLAUDE.md exists: it is a
pointer to the canonical file, never a second standard. Do not maintain
two independent instruction files, which drift.

A symlink from CLAUDE.md to AGENTS.md also works, but the import is safer
across platforms, since a symlink on Windows needs administrator rights and
otherwise checks out as a text file holding the path.

## Length

Cap each instruction file at 200 lines. Longer files consume context and
reduce adherence; shorter files improve it. Include the build and test
commands, the repo layout, the conventions that differ from tool
defaults, and the hard "never do X" rules. Exclude anything an agent can
read from the code, such as a directory tree or a dependency list.
Personal preference belongs in a user-level file, not a committed one.

## Guidance versus enforcement

An instruction file shapes behavior. It does not enforce anything. For a
rule that must hold at a fixed point, such as before a commit or before
an outbound post, use a hook. The guards in `hooks/` are the enforcement
layer; AGENTS.md is the guidance layer. See `hooks/README.md`.

## Review cadence

Re-check the whole surface after each major model upgrade. Delete a line
when a current model no longer needs it, then add back only what earns
its place by changing behavior. Much of what an older model needed, a
newer one handles on its own.

## Sources

- Claude Code memory and AGENTS.md: https://code.claude.com/docs/en/memory
- The AGENTS.md standard: https://agents.md/
