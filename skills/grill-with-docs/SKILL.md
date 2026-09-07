---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design that also writes the docs, ADRs and glossary, as you go.
invocation: user
aliases: [grill-with-docs]
includes: [grilling, domain-modeling]
capabilities: [subagents]
---

# Grill with docs

Run the interview and capture the domain model at the same time, so a
new project starts documented rather than documented later.

> Run playbook: grilling

> Run playbook: domain-modeling

As each decision lands, record it inline: add or sharpen the term in
`CONTEXT.md`, and open an ADR under `docs/adr/` for a cross-cutting or
hard-to-reverse choice. Once the repo is public, the same material seeds
the user-facing docs. Do not leave documentation for afterward.
