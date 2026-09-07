# 0001. Record architecture decisions

- Status: Accepted
- Date: 5 September 2026

## Context

A project accumulates decisions that shape its structure and are costly
to reverse. Without a record, the reasons are lost and a later engineer
either relitigates a settled question or breaks an assumption they never
knew was there.

## Decision

We will record architecturally significant decisions as ADRs in this
directory, using the Nygard format in `template.md`. We will number them
sequentially, treat an accepted record as immutable and supersede
rather than edit.

## Consequences

The reasoning behind a decision stays with the code and travels with the
repo. Reviewers can see why a choice was made. The cost is a short
writeup per significant decision, which is small next to the cost of a
silent reversal.
