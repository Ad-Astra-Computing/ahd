---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual report, then grill through whichever one is chosen.
disable-model-invocation: true
---

# Improve codebase architecture

Surface architectural friction and propose deepening opportunities:
refactors that turn shallow modules into deep ones. The aim is
testability and easy navigation.

Use the shared design vocabulary. Read it first so every suggestion uses
the same words, module, interface, depth, seam, adapter, reach and
locality, and does not drift into "component" or "service":

Call the Skill tool with "codebase-design".
The domain language in `CONTEXT.md` names the good seams, and the ADRs
in `docs/adr/` record decisions this pass should not re-litigate.

## Process

### 1. Explore

Scope before you scan. Deepening a module pays off on the parts that
keep changing, so decide where to look first. If the user named a
direction, take it. Otherwise walk back a stretch of `git log --oneline`
to find the hot spots, the files that keep coming up, then start there.

Then walk the code, with a subagent if you have that capability, and
note friction: where understanding one concept means bouncing between
many small modules, where a module's interface is nearly as complex as
its implementation, where pure functions were extracted only for
testing but the real bugs hide in how they are called, where coupled
modules leak across their seams, and what is hard to test through its
current interface. Apply the deletion test to anything you suspect is
shallow.

### 2. Present candidates as a report

Write a self-contained HTML file to the OS temp directory so nothing
lands in the repo, and open it. For each candidate render a card: the
files involved, the friction, the plain-English change, the benefit in
terms of locality and reach and how tests would improve, a before and
after sketch, and a recommendation strength of strong, worth exploring,
or speculative. End with the one you would tackle first and why. Use the
`CONTEXT.md` vocabulary for the domain and the design vocabulary for the
architecture. If a candidate contradicts an ADR, surface it only when
the friction is real enough to reopen the ADR, and mark it clearly.

Do not propose interfaces yet. Ask which candidate to explore.

### 3. Grill the choice

Once the user picks one, walk the decision tree with them: the
constraints, the shape of the deepened module, what sits behind the
seam, what tests survive.

Call the Skill tool with "grilling".
Record decisions inline as they land.

Call the Skill tool with "domain-modeling".