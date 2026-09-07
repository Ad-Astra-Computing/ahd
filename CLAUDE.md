@AGENTS.md

## Claude Code

The rules above are the whole standard. This section is only for
Claude-specific behavior.

- Use plan mode for changes that touch the release workflows, the
  eval runners' credential handling or CI secrets.
- Keep this file short. Anything that applies to every agent belongs in
  AGENTS.md, not here. Anything derivable from the code belongs in
  neither.
