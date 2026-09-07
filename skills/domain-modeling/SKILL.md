---
name: domain-modeling
description: Build or sharpen the project's domain model. Use when naming concepts, resolving a fuzzy term or keeping CONTEXT.md and ADRs current as decisions land.
invocation: model
aliases: [domain-modeling]
includes: []
capabilities: []
---

# Domain modeling

Keep one shared language for the project, so code, tests and docs all
name the same concept the same way.

The model lives in `CONTEXT.md` at the repo root: a short glossary of the
domain terms and what each means. Decisions that shape the model live as
ADRs under `docs/adr/`.

Run this inline as you work, not as a separate pass:

- Naming something after a concept that is not in `CONTEXT.md` yet? Add
  the term with a one-line definition. Create the file if it does not
  exist.
- Using a term that is fuzzy or overloaded? Sharpen its definition in
  `CONTEXT.md` right there, and use it consistently afterward.
- Making a cross-cutting or hard-to-reverse modeling decision? Record it
  as an ADR so a future reader does not relitigate it.

A good term is a noun from the problem domain that a non-engineer on the
project would recognize. Prefer the domain's own word over an invented
one. When two terms mean the same thing, pick one and retire the other.

The test of the model: a new contributor can read `CONTEXT.md` and then
read the code without a translation layer in their head.
