---
name: tdd
description: Test-driven development. Use when building a feature or fixing a bug test-first, or when the user mentions red-green-refactor.
invocation: model
aliases: [tdd]
includes: [codebase-design]
capabilities: []
---

# Test-driven development

TDD is the red then green loop. This playbook makes that loop produce
tests worth keeping: what a good test is, where tests go, the
anti-patterns and the rules of the loop. Every section applies on every
cycle. Consult them during the loop, not after.

When you explore the codebase, read `CONTEXT.md` if it exists so test
names and interface vocabulary match the project's domain language, and
respect the ADRs in the area you are touching.

## A good test

A test verifies behavior through a public interface, not an
implementation detail. The code can change entirely and the test should
not. A good test reads like a specification: "user can checkout with a
valid cart" tells you what capability exists, and it survives a refactor
because it does not care about internal structure.

## Seams: where tests go

A seam is the public boundary you test at, the interface where you
observe behavior without reaching inside. Tests live at seams, never
against internals.

Test only at agreed seams. Before writing any test, write down the seams
under test and confirm them with the user. You cannot test everything,
so agreeing the seams up front is how the effort lands on the critical
paths and the complex logic instead of every edge case.

Ask: what is the public interface, and which seams should we test.

When the shape of that interface is itself in question, how deep the
module is, where the seam belongs, what it should expose:

> Run playbook: codebase-design

## Anti-patterns

- Implementation-coupled: mocks internal collaborators, tests private
  methods, or checks through a side channel such as querying the
  database instead of using the interface. The tell is a test that
  breaks on a refactor when behavior did not change.
- Tautological: the assertion recomputes the expected value the same way
  the code does, so it passes by construction and can never disagree
  with the code. Expected values come from an independent source: a
  known-good literal, a worked example, the spec.
- Horizontal slicing: writing all the tests first, then all the
  implementation. Bulk tests verify imagined behavior and go insensitive
  to real change. Work in vertical slices instead: one test, one
  implementation, repeat, each test a tracer bullet that responds to
  what the last cycle taught you.

## Rules of the loop

- Red before green. Write the failing test first, then only enough code
  to pass it. Do not add speculative features.
- One slice at a time. One seam, one test, one minimal implementation
  per cycle.
- Refactoring is not part of the loop. It belongs to the review stage,
  with the tests green, not the red then green cycle.
