---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says diagnose or debug this, or reports something broken, throwing, failing or slow.
invocation: model
aliases: [diagnose, debug]
includes: []
capabilities: [subagents, shell, browser]
---

# Diagnosing bugs

A discipline for hard bugs. Skip a phase only when you can justify it.
Read `CONTEXT.md` if it exists for a mental model of the modules, and
check the ADRs in the area you are touching.

## Redact

This playbook has you show commands, outputs and captured artifacts.
Redact every secret first, writing `<REDACTED>` in its place. Build
loops against env vars so the credential stays in the environment. If
the redacted output is not enough to diagnose the bug, say so and ask.

## Phase 1: build a feedback loop

This is the skill. Everything else is mechanical. With a tight pass or
fail signal that goes red on this specific bug, you will find the cause.
Without one, no amount of staring at code will save you. Spend
disproportionate effort here. Be aggressive, be creative, do not give up.

Ways to build one, in rough order:

1. A failing test at whatever seam reaches the bug.
2. A curl or HTTP script against a running dev server.
3. A CLI call with a fixture input, diffing stdout against a known-good
   snapshot.
4. A headless browser script that drives the UI and asserts on the DOM,
   the console or the network.
5. Replay a captured trace: save a real request, payload or event log
   and replay it through the code path in isolation.
6. A throwaway harness: a minimal subset of the system, deps mocked,
   that hits the bug path in one call.
7. A property or fuzz loop for a "sometimes wrong" bug: run many random
   inputs and look for the failure.
8. A bisection harness if the bug appeared between two known states, so
   you can automate boot, check, repeat.
9. A differential loop: the same input through old versus new, diff the
   outputs.
10. A human-in-the-loop script as a last resort, so even a manual step
    stays structured and its output feeds back to you.

### Tighten the loop

Treat the loop as a product. Make it faster: cache setup, skip unrelated
init, narrow the scope. Make the signal sharper: assert on the specific
symptom, not "did not crash". Make it deterministic: pin time, seed the
RNG, isolate the filesystem, freeze the network. A 2-second deterministic
loop is a debugging superpower; a 30-second flaky one is barely a loop.

For a non-deterministic bug the goal is not a clean repro but a higher
reproduction rate. Loop the trigger many times, parallelise, add stress,
narrow timing windows. A 50 percent flake is debuggable; 1 percent is
not, so keep raising the rate.

If you genuinely cannot build a loop, stop and say so. List what you
tried. Ask for access to the environment, a redacted captured artifact,
or permission to add temporary instrumentation. Do not hypothesize
without a loop.

Phase 1 is done when you can name one command you have already run at
least once, shown with its redacted output, that is red-capable
(it drives the real bug path and asserts the user's exact symptom),
deterministic, fast and runnable unattended. If you catch yourself
reading code to build a theory before this command exists, stop.

## Phase 2: reproduce and minimise

Run the loop and watch it go red. Confirm it produces the failure the
user described, not a nearby one. Confirm it repeats. Capture the exact
symptom. Then shrink the repro to the smallest scenario that still goes
red: cut inputs, callers, config and steps one at a time, re-running
after each cut. Done when every remaining element is essential, meaning
removing any one makes the loop go green.

## Phase 3: hypothesise

Generate three to five ranked, falsifiable hypotheses before testing
any. Each states its prediction: if X is the cause, then changing Y
makes the bug disappear. If you cannot state the prediction, the
hypothesis is a vibe. Show the ranked list to the user before testing;
they often re-rank it instantly. Do not block on it if they are away.

## Phase 4: instrument

Each probe maps to a specific prediction. Change one variable at a time.
Prefer a debugger or REPL over logs; one breakpoint beats ten log lines.
Tag every debug log with a unique prefix so cleanup is one search. For a
performance regression, measure first with a baseline and a profiler,
then bisect.

## Phase 5: fix and regression test

Write the regression test before the fix, but only if a correct seam
exists, meaning one where the test exercises the real bug pattern as it
occurs at the call site. If the only seam is too shallow, that itself is
the finding: note it, the architecture is preventing the bug from being
locked down. If a correct seam exists, turn the minimised repro into a
failing test there, watch it fail, apply the fix, watch it pass, then
re-run the Phase 1 loop against the original scenario.

## Phase 6: cleanup

Before declaring done: the original repro no longer reproduces, the
regression test passes or the absence of a seam is documented, all
tagged instrumentation is removed, throwaway prototypes are deleted, and
the hypothesis that turned out correct is stated in the commit or PR so
the next debugger learns.
