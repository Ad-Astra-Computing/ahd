---
name: to-tickets
description: Break a plan, spec or the current conversation into tracer-bullet tickets, each declaring what blocks it, published to the configured tracker.
disable-model-invocation: true
---

# To tickets

Break a plan, spec or conversation into tickets: tracer-bullet vertical
slices, each declaring the tickets that block it.

## Process

### 1. Gather context

Work from what is already in the conversation. If the user passes a
reference such as a spec path or an issue number, fetch it and read the
full body and comments.

### 2. Explore the codebase, optional

If you have not explored the code, do so, so ticket titles use the
project's domain vocabulary and respect the ADRs in the area. Look for a
chance to prefactor so the change is easier: make the change easy, then
make the easy change.

### 3. Draft vertical slices

- Each slice cuts a narrow but complete path through every layer,
  schema, API, UI, tests. Vertical, not one layer at a time.
- A finished slice is demoable or verifiable on its own.
- Each slice fits in a single fresh context window.
- Any prefactor goes first.

Give each ticket its blocking edges: the tickets that must finish before
it can start. A ticket with no blockers can start immediately.

A wide refactor is the exception. When one mechanical change breaks
thousands of call sites at once, do not force it into a tracer bullet.
Sequence it as expand then contract. Expand: add the new form beside the
old so nothing breaks. Migrate the call sites in batches, each its own
ticket blocked by the expand, keeping the build green because the old
form still exists. Contract: delete the old form once no caller remains,
blocked by every migrate batch.

### 4. Quiz the user

Present the breakdown as a numbered list. For each ticket show the
title, what it delivers end to end and what blocks it. Ask whether the
granularity is right, whether the blocking edges are correct, and
whether any ticket should be merged or split. Iterate until they approve.

### 5. Publish

Publish the approved tickets in dependency order, blockers first, so
each ticket can reference real identifiers. On a real tracker use its
native blocking or sub-issue link. As local files, write one file per
ticket under `.scratch/<feature>/issues/NN-slug.md`, numbered from 01 in
dependency order. Work the frontier: any ticket whose blockers are all
done. Do not modify the parent issue.

Avoid file paths and code snippets in a ticket; they go stale. The
exception is a snippet that encodes a decision more precisely than prose
can, such as a state machine or a type shape.

## Ticket template

```
# NN: <title>

What to build: the end-to-end behavior this ticket makes work, from the
user's point of view, not a layer-by-layer list.

Blocked by: the tickets that gate this one, or "none, can start now".

Status: ready-for-agent

- [ ] acceptance criterion 1
- [ ] acceptance criterion 2
```
