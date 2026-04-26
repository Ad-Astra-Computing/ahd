# Contributing to AHD as an autonomous agent

This file is the agent-targeted contract for autonomous agents (Claude
Code, Codex, Cursor, Aider, custom AHD-aware tooling) submitting AHD
eval reports on behalf of a human principal. It composes with
[CONTRIBUTING.md](CONTRIBUTING.md), it does not replace it. The human
contract there names *what a submission is*; this file names *what an
agent must do before pressing submit*.

This file is prose. The deterministic enforcement layer ships
alongside it: three JSON Schema files derived from a Zod source of
truth in `src/eval/types.ts`, plus a `ahd validate-submission <dir>`
CLI command that parses a contribution envelope and reports current
versus target compliance.

```
schema/manifest.current.schema.json        # required for review
schema/manifest.target.schema.json         # aspirational, warn-only
schema/sample-envelope.target.schema.json  # per-sample envelope, target
```

Run `ahd validate-submission <run-dir>` before opening a PR. Exit 0
means the current schema accepts the manifest. Missing aspirational
fields surface as warnings without failing the run. The maintainer
re-runs the same validator on receipt; cleverness has no payoff.

If you are a human reading this: the equivalent prose for you lives in
CONTRIBUTING.md and on
[ahd.adastra.computer/evals/contribute](https://ahd.adastra.computer/evals/contribute).
This file is shorter because it is written for a reader that does not
benefit from rhetoric.

## Contract versus current support

This document describes the **target contract** for a complete
submission. The current `ahd` CLI captures the core fields (token,
briefPath, n, runAt, spec, canonicalId, sanitizedId, provider) and the
core sample-on-disk shape. The richer per-cell fields named below
(`servingPath`, `cliVersion`, `runnerVersion`, `requestIds`, the full
`<sample-id>.envelope.json` shape) are the target. Where a field is
not yet captured automatically, agents should either capture it
manually from the runner's invocation context or surface to the
principal that the field is missing rather than fabricate it. The
maintainer accepts current-shape submissions today and will tighten
the requirement as runners catch up.

## Trust gate (read this first)

You are not the gate. The maintainer is.

Every submitted run is **re-linted on receipt** against the same
samples the agent submitted. The numbers a contributor publishes are
not authoritative; the maintainer's re-run is. An agent that submits
fabricated numbers is detected at the re-lint, not at the social
layer. So the optimal agent strategy is to submit honest, complete
manifests; cleverness has no payoff.

The maintainer also uses provider request-IDs (Anthropic
`request-id`, OpenAI `x-request-id`, Cloudflare `cf-ray`, Google
`x-goog-api-client-request-id`) to verify that the API calls actually
happened. Do not strip these from the envelope.

## Required steps, in order

```
1. Read briefs/landing.yml or the brief you intend to submit against.
2. Read tokens/<token-id>.yml. Note any lint-overrides.disable list.
3. Run: ahd eval-live <token> --brief <path> --models <spec,...> --n 30 --out <dir>
4. Run: ahd eval <token> --samples <dir> --report <out>.md
5. Verify: ahd lint --token <token> <a sample>.html  (sanity)
6. Validate the envelope: ahd validate-submission <run-dir>
   (current schema must PASS; target warnings are surfaced but
   non-blocking)
7. Stop. Surface to your principal:
   - The headline numbers (per-cell raw mean, compiled mean, reduction)
   - Any cells with extractionFailed > 0 or errored > 0
   - Any cells where reduction is negative (regressions are first-class data)
   - The validate-submission output (any target-schema warnings)
   - The full output directory path
8. Wait for explicit human authorisation before opening a PR.
```

A submission that bypasses step 7 is not a submission, regardless of
how clean the numbers look.

## Required envelope (the unit of submission)

```
<token>/
  manifest.json                      # canonical model ids + serving paths + request-IDs
  compiled-prompt.txt                # exact bytes sent to provider
  <cell-sanitized-id>/
    raw/
      sample-001.html                # extracted HTML
      sample-001.envelope.json       # full provider response, headers, finish reason, token usage
      …
    compiled/
      sample-001.html
      sample-001.envelope.json
      …
```

Minimum `n` per cell is 30. Three is acceptable for a *probe* PR
(`probe: …` in the title) but never for a publishable run.

## Required manifest fields (machine-checked)

```json
{
  "token": "<id>",
  "briefPath": "briefs/<file>.yml",
  "n": 30,
  "runAt": "<ISO-8601 UTC>",
  "models": [
    {
      "spec": "<runner>:<model>",
      "canonicalId": "<exact-model-id>",
      "sanitizedId": "<filesystem-safe>",
      "provider": "<runner-name>",
      "servingPath": "<full URL or @cf/.../...>",
      "cliVersion": "<x.y.z>",
      "runnerVersion": "<ahd-pkg-version>",
      "requestIds": ["<list>"]
    }
  ]
}
```

If your runner does not capture one of the target fields, **do not
fabricate it**. Use the value the runner actually surfaces (omitting
the field is acceptable while it remains target-state, per the
"Contract versus current support" section above) and surface the gap
to the principal so they can decide whether to submit a current-shape
run or wait for the runner to be patched. Never invent a value that
looks plausible: missing-field-with-disclosure is honest evidence;
guessed-field-without-disclosure is fabrication.

## Forbidden behaviours

The following are auto-reject on the maintainer side. An agent that
does these will burn the principal's reputation.

- Post-processing samples: pretty-printing, whitespace stripping,
  re-wrapping, HTML re-emission. The envelope must reflect the
  model's raw output.
- Dropping cells with negative reductions, errors, or extraction
  failures. Negative results are first-class data.
- Submitting `n = 1` or `n = 2` outside an explicit `probe:` PR.
- Editing the compiled prompt to make a particular cell perform
  better. The prompt is the AHD compiler's output; tampering with it
  invalidates the run.
- Re-running until a clean cell appears. Stochastic models will
  always have a "good run" by chance; cherry-picking is the
  canonical fabrication fingerprint.
- Opening a PR without explicit human authorisation. "Full
  autonomy" does not extend to public-facing artefacts.

## Token-aware lint

Two layers, with different guarantees. Don't conflate them.

**Compiler contract (deterministic, default-on).** When `ahd compile`
or `ahd eval-live` builds a compiled prompt, the prompt template
instructs the model to emit `<meta name="ahd-token" content="<id>">`
in the document head. The token's `lint-overrides.disable[]` block is
authoritative: when `ahd lint` or `ahd eval` is invoked with `--token
<id>` (or with token auto-detected from the meta anchor), those rules
are silenced.

**Runner / operator fallback (best-effort).** Auto-detection of the
active token from `<meta name="ahd-token">` depends on the model
having actually emitted the anchor as instructed. Frontier models
typically comply; smaller OSS models sometimes drop the meta in
favour of decorative content. **Pass `--token <id>` explicitly** at
lint and eval time when you control the invocation. Do not rely on
auto-detection for submitted runs; the explicit flag is the contract,
the meta sniff is a convenience.

What changes when the token suppresses a rule is documented on
[the 24 April eval page](https://ahd.adastra.computer/evals/2026-04-24-post-digital-green-n30).

## Reduced-motion in compiled output

The compiled prompt now requires that any animation or transition
longer than 200ms is wrapped in
`@media (prefers-reduced-motion: no-preference)` or provides an
equivalent reduce-motion fallback (WCAG 2.3.3). The
`ahd/respect-reduced-motion` rule fires on output that ignores this.
If a model frequently emits ungated motion under your runner, that
is reportable as a model-behaviour finding; do not silence the rule
to make the cell read cleaner.

## Probe versus publishable

| Kind        | Min n | PR title prefix | Maintainer treatment                  |
|-------------|-------|-----------------|---------------------------------------|
| probe       | 3     | `probe:`        | Light review; not added to /evals     |
| publishable | 30    | `evals:`        | Full re-lint review; published if clean |

A publishable PR with `n = 3` will be relabelled probe.

## What the agent must surface to its principal before submitting

This is the part automated tooling reliably gets wrong. The agent
**must** present the principal with, at minimum:

```
- Run path: <abs path to output dir>
- Cells: <count> · samples per cell: <n> · total: <count*n*2>
- Per-cell verdict (raw mean → compiled mean → reduction%)
- Any cell with errored > 0 OR extractionFailed > 0
- Any cell where reduction < 0 (a regression is a result, not a problem)
- Anything the agent silently changed (prompt overrides, lint-override
  edits, sample renames, post-processing). Disclose, don't hide.
```

If the principal does not respond, the agent does not submit. The
default action when there is doubt is **wait**.

## When in doubt

Ask the principal. If the principal is unreachable, write a status
file at `<run-dir>/.ahd-blocker.json` and stop. A run that sits on
disk for a day costs nothing; a bad submission costs the framework's
credibility.

The status file is named `.ahd-blocker.json` so multiple agents
working on the same machine produce a consistent artefact the
principal can inspect by directory. Shape:

```json
{
  "createdAt": "<ISO-8601 UTC>",
  "agent": "<agent identifier, e.g. 'claude-code/2.x'>",
  "runDir": "<absolute path>",
  "stage": "compile | eval-live | eval | lint | publish",
  "completed": ["compile", "eval-live"],
  "blockedOn": "<one-line reason: 'expired CF_API_TOKEN', 'principal authorisation needed', 'manifest missing servingPath for 2 cells'>",
  "needsFromPrincipal": [
    "<concrete ask, e.g. 'rotate CF_API_TOKEN', 'review numbers + authorise PR'>"
  ],
  "summary": {
    "cells": <count>,
    "n": <count>,
    "samplesOnDisk": <count>,
    "errored": <count>,
    "extractionFailed": <count>
  }
}
```

Required fields: `createdAt`, `agent`, `stage`, `blockedOn`. Everything
else is best-effort. Multiple blocker files are allowed (numbered
`.ahd-blocker-1.json`, `.ahd-blocker-2.json`); the principal scans
the run directory to surface them.
