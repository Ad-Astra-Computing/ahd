# Skills

Reusable playbooks an agent can run on demand. They are agent-agnostic:
one neutral source per skill, and a build step that generates the
adapters each tool needs. The disciplines are ported from the
mattpocock/skills project (https://github.com/mattpocock/skills) and
adapted to run the same way on Claude Code, Codex and Polymetis, the
Ad Astra internal harness.

## Layout

- `skills/<name>/SKILL.md` is the source of truth. Its frontmatter holds
  the manifest fields; its body is tool-neutral prose.
- `tools/build-adapters.py` reads every source skill and writes the
  adapters under `adapters/`. They are generated but committed, so a
  clone has them ready. CI runs the build with `--check` and fails if
  they have drifted from the sources.

## Frontmatter

- `name`: the skill name, also its command name.
- `description`: one sentence. For a model-invoked skill this is the
  trigger the agent matches on.
- `invocation`: `model` if the agent may select it on its own, `user` if
  it fires only when a person asks for it by name.
- `aliases`: other names or trigger words.
- `includes`: other skills this one composes.
- `capabilities`: what the skill wants from the harness, such as
  `subagents` or `browser`. A harness that lacks one does the work in
  line instead of failing.

## Composition

A skill composes another by a line in its body:

```
> Run playbook: grilling
```

The build expands that per target: Claude Code gets the Skill-tool call,
Codex gets a pointer to the source, Polymetis reads it from the manifest.

## Build

```
python3 tools/build-adapters.py          # write adapters/
python3 tools/build-adapters.py --check  # CI: fail if adapters are stale
```

## A note on vocabulary

The source project names one design term with a word our prose guard
flags as a tell. The ported playbooks use "reach" for the same idea:
how much a module does behind a small interface.
