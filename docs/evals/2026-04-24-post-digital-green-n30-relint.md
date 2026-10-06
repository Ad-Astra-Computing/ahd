# ahd eval · post-digital-green · token-aware re-lint

A re-lint of the 24 April 2026 run under the corrected ruleset. No model
was called. The samples are the ones committed under
`evals/post-digital-green/`. Only the rules that scored them changed.

## Why this report exists

The original run reported eight of eleven cells regressing under the
compiled prompt. The compiler was not at fault. Several lint rules encoded
the editorial defaults that `post-digital-green` exists to reject, so they
fired on output that had followed the token correctly. Token-aware linting
shipped in v0.9 in response. A token may declare a `lint-overrides.disable`
block naming the rules it rejects, and the linter silences those rules when
it knows which token produced the output.

How the linter learns that differs between new output and this run.
Compiled output generated since v0.9 carries a `<meta name="ahd-token">`
anchor and the linter reads it. These samples predate the change and carry
no anchor, so the token is named on the command line instead and the same
overrides are applied from it. The rules silenced are identical either way.

This is the same run scored again under those overrides. 660 runs were
attempted, 659 returned a response and 656 were usable HTML that reached
the linter. The shortfall is one cell: gemini compiled returned 29
responses and scored 26 of them.

The original report is preserved unchanged at
[`2026-04-24-post-digital-green-n30.md`](2026-04-24-post-digital-green-n30.md)
and is not superseded by this one. The two readings answer different
questions. The first records what the ruleset said at the time. The second
records what it says once the rules the token explicitly rejects are
silenced.

## Reproducing it

```bash
ahd eval post-digital-green --samples evals
```

It needs no network access and no API key. The samples it reads are in the
repository, so anyone who clones it can regenerate this file.

`ahd eval` moved to the severity-split statistic at the 21 September 2026
epoch boundary (`docs/adr/0002-eval-epochs-and-published-statistic.md`), so
the auto-generated section below no longer emits the single blended
reduction percentage the table two sections down was built from. The
"pre-fix Δ" and "post-fix Δ" columns there stay as published: a frozen
reading under the old statistic, not reproducible by current tooling. The
per-tell frequency table below is unaffected by the statistic change and
still matches the 24 April page to the percentage point.

The next two sections read that frozen old-statistic reduction percentage,
not a derived verdict. The
current verdict per model and severity, under the statistic this ADR
boundary introduced, is in "## Run" below; where the two disagree, "## Run"
is the current reading.

## Reduction-percentage shift, by cell

| model | pre-fix Δ | post-fix Δ | direction (old statistic) |
|---|---:|---:|---|
| `@cf/google/gemma-4-26b-a4b-it` | -10.5% | **+50.0%** | sign flipped, now positive |
| `@cf/openai/gpt-oss-120b` | +19.8% | **+47.6%** | more than doubled |
| `@cf/moonshotai/kimi-k2.6` | -14.4% | **+30.5%** | sign flipped, now positive |
| `gemini-3.1-pro-preview` | -9.9% | **+26.3%** | sign flipped, now positive |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | +34.7% | +21.7% | positive, smaller margin |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | +4.8% | +3.2% | flat in both readings |
| `gpt-5.5` | -135.5% | -9.1% | negative, closer to zero |
| `gpt-5.4` | -78.6% | -36.4% | negative, closer to zero |
| `claude-opus-4-7` | -172.9% | -67.6% | negative, closer to zero |
| `@cf/qwen/qwen3-30b-a3b-fp8` | -17.6% | -87.5% | negative, further from zero, see below |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | -100.0% | -200.0% | negative, further from zero, see below |

Six cells read positive under the old percentage where three did before.

## What the fix did not solve

Five cells read negative under the old percentage, and two of them read further from zero than they did.

Llama 3.3 sits at the lowest absolute baseline in the run, 0.10 raw against
0.30 compiled. An increase of 0.20 tells per page reads as -200 percent
while saying almost nothing about the model. Qwen3 has a milder version of
the same problem: a 0.53 baseline still inflates a 0.47 increase into -87.5
percent. Percentages taken against a baseline this small are noise wearing
a decimal point, and both cells should be read from the mean columns rather
than the reduction column.

The frontier cells are a real finding rather than an artefact. Claude,
gpt-5.4 and gpt-5.5 read negative under the old percentage because rules
outside the token's suppression list are firing on their compiled output.
`respect-reduced-motion` accounts for most of it: it fires on 97 percent of
Claude's compiled samples against 10 percent raw, and climbs from 7 to 37
percent on gpt-5.4 and from zero to 30 percent on gpt-5.5. Token-aware
linting closed the part of the gap the suppression list covers. What
remains is either the compiled prompt or the models, and this run does not
separate the two.

## Run

- Brief: `briefs/landing.yml`
- Samples per cell: **30**
- Max tokens: 12000
- Models:
  - `claude-opus-4-7` (claude-code-cli) · spec `claude-code:claude-opus-4-7`
  - `gpt-5.4` (codex-cli) · spec `codex-cli:gpt-5.4`
  - `gpt-5.5` (codex-cli) · spec `codex-cli:gpt-5.5`
  - `gemini-3.1-pro-preview` (gemini-cli) · spec `gemini-cli:gemini-3.1-pro-preview`
  - `@cf/google/gemma-4-26b-a4b-it` (cloudflare-workers-ai) · spec `cf:@cf/google/gemma-4-26b-a4b-it`
  - `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (cloudflare-workers-ai) · spec `cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  - `@cf/meta/llama-4-scout-17b-16e-instruct` (cloudflare-workers-ai) · spec `cf:@cf/meta/llama-4-scout-17b-16e-instruct`
  - `@cf/mistralai/mistral-small-3.1-24b-instruct` (cloudflare-workers-ai) · spec `cf:@cf/mistralai/mistral-small-3.1-24b-instruct`
  - `@cf/moonshotai/kimi-k2.6` (cloudflare-workers-ai) · spec `cf:@cf/moonshotai/kimi-k2.6`
  - `@cf/openai/gpt-oss-120b` (cloudflare-workers-ai) · spec `cf:@cf/openai/gpt-oss-120b`
  - `@cf/qwen/qwen3-30b-a3b-fp8` (cloudflare-workers-ai) · spec `cf:@cf/qwen/qwen3-30b-a3b-fp8`

## Per-model severity split: lint violations reduced

Raw mean tells minus compiled mean tells, per severity stratum, never blended. This is a count of lint violations, not a judgment of design quality; the compiler teaches the conventions the linter rewards, so a fall in fires is evidence of compliance with AHD, not by itself evidence of a better page. The interval is a 99.5% Welch t interval on this run's per-page mean tell counts, degrees of freedom by Welch-Satterthwaite, each arm's variance floored so a page count that never varies does not carry zero uncertainty; a BCa bootstrap over the same counts is computed as a cross-check and never decides the verdict. The verdict is derived from the interval, not hand written. This run has no replay block (`ahd eval` re-lints committed samples with no model call to record), so the floor and the bootstrap cross-check exist only for this invocation and are not persisted anywhere; re-run this command to see them again.

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.07 | -0.07 | [-0.39, 0.26], df 57.1 | not estimable | not resolved in this run |
| warn | 0.87 | 0.37 | 0.50 | [0.13, 0.87], df 58.0 | 57.7% | reduced in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.83), induced 0 (gross 0.00), net (compiled minus raw) -0.43.

Removed: `ahd/line-height-per-size` (warn, d=-0.83)

### `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |
| warn | 0.10 | 0.30 | -0.20 | [-0.61, 0.21], df 55.2 | not estimable | not resolved in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 0 (gross 0.00), induced 0 (gross 0.00), net (compiled minus raw) 0.20.

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |
| warn | 1.03 | 1.00 | 0.03 | [-0.27, 0.34], df 58.0 | 3.2% | not resolved in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.90), induced 1 (gross 0.87), net (compiled minus raw) -0.03, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.90)

Induced: `ahd/line-height-per-size` (warn, d=0.87)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |
| warn | 1.53 | 1.20 | 0.33 | [-0.01, 0.68], df 55.4 | 21.7% | not resolved in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.83), induced 1 (gross 0.43), net (compiled minus raw) -0.33, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.83)

Induced: `ahd/line-height-per-size` (warn, d=0.43)

### `@cf/moonshotai/kimi-k2.6`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.13 | 0.33 | -0.20 | [-0.57, 0.17], df 58.0 | not estimable | not resolved in this run |
| warn | 1.47 | 1.03 | 0.43 | [-0.04, 0.90], df 55.8 | 29.5% | not resolved in this run |
| info | 0.37 | 0.00 | 0.37 | [-0.00, 0.73], df 53.1 | not estimable | not resolved in this run |

Ledger: removed 2 (gross 0.93), induced 1 (gross 0.30), net (compiled minus raw) -0.60, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.60), `ahd/svg/palette-bounds` (info, d=-0.33)

Induced: `ahd/respect-reduced-motion` (error, d=0.30)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.03 | -0.03 | [-0.35, 0.28], df 57.7 | not estimable | not resolved in this run |
| warn | 1.40 | 0.70 | 0.70 | [0.24, 1.16], df 52.3 | 50.0% | reduced in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.73), induced 0 (gross 0.00), net (compiled minus raw) -0.67.

Removed: `ahd/line-height-per-size` (warn, d=-0.73)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |
| warn | 0.53 | 1.00 | -0.47 | [-0.82, -0.11], df 56.8 | -87.5% | increased in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 0 (gross 0.00), induced 1 (gross 0.43), net (compiled minus raw) 0.47.

Induced: `ahd/line-height-per-size` (warn, d=0.43)

### `claude-opus-4-7`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.10 | 0.97 | -0.87 | [-1.21, -0.52], df 57.6 | not estimable | increased in this run |
| warn | 1.03 | 0.83 | 0.20 | [-0.23, 0.63], df 56.8 | 19.4% | not resolved in this run |
| info | 0.00 | 0.10 | -0.10 | [-0.43, 0.23], df 56.6 | not estimable | not resolved in this run |

Ledger: removed 0 (gross 0.00), induced 1 (gross 0.87), net (compiled minus raw) 0.77.

Induced: `ahd/respect-reduced-motion` (error, d=0.87)

### `gemini-3.1-pro-preview`

Scored: raw 30 → 30, compiled 30 → 26.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.27 | -0.27 | [-0.63, 0.09], df 48.2 | not estimable | not resolved in this run |
| warn | 1.20 | 0.62 | 0.58 | [0.06, 1.11], df 53.9 | 48.7% | reduced in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.33, 0.33], df 52.2 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.76), induced 1 (gross 0.27), net (compiled minus raw) -0.32, offsetting.

Removed: `ahd/line-height-per-size` (warn, d=-0.76)

Induced: `ahd/respect-reduced-motion` (error, d=0.27)

### `gpt-5.4`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.07 | 0.37 | -0.30 | [-0.66, 0.06], df 57.6 | not estimable | not resolved in this run |
| warn | 0.30 | 0.13 | 0.17 | [-0.20, 0.54], df 58.0 | not estimable | not resolved in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 0 (gross 0.00), induced 0 (gross 0.00), net (compiled minus raw) 0.13.

### `gpt-5.5`

Scored: raw 30 → 30, compiled 30 → 30.

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |
|---|---:|---:|---:|---:|---:|---|
| error | 0.00 | 0.30 | -0.30 | [-0.64, 0.04], df 55.6 | not estimable | not resolved in this run |
| warn | 0.37 | 0.10 | 0.27 | [-0.10, 0.63], df 57.8 | not estimable | not resolved in this run |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | not resolved in this run |

Ledger: removed 1 (gross 0.33), induced 1 (gross 0.30), net (compiled minus raw) 0.03, offsetting.

Removed: `ahd/tracking-per-size` (warn, d=-0.33)

Induced: `ahd/respect-reduced-motion` (error, d=0.30)

## Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the ledger's existing induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

### `ahd/respect-reduced-motion` (error), induced in 4 model(s)

Qualifying: `@cf/moonshotai/kimi-k2.6`, `claude-opus-4-7`, `gemini-3.1-pro-preview`, `gpt-5.5`

| model | raw incidence | compiled incidence | classification |
|---|---:|---:|---|
| `@cf/google/gemma-4-26b-a4b-it` | 0% | 7% | none |
| `@cf/moonshotai/kimi-k2.6` | 3% | 33% | induced |
| `claude-opus-4-7` | 10% | 97% | induced |
| `gemini-3.1-pro-preview` | 0% | 27% | induced |
| `gpt-5.4` | 7% | 37% | none |
| `gpt-5.5` | 0% | 30% | induced |

## Per-tell frequency (scored samples only)

| tell | @cf/google/gemma-4-26b-a4b-it/raw | @cf/google/gemma-4-26b-a4b-it/compiled | @cf/meta/llama-3.3-70b-instruct-fp8-fast/raw | @cf/meta/llama-3.3-70b-instruct-fp8-fast/compiled | @cf/meta/llama-4-scout-17b-16e-instruct/raw | @cf/meta/llama-4-scout-17b-16e-instruct/compiled | @cf/mistralai/mistral-small-3.1-24b-instruct/raw | @cf/mistralai/mistral-small-3.1-24b-instruct/compiled | @cf/moonshotai/kimi-k2.6/raw | @cf/moonshotai/kimi-k2.6/compiled | @cf/openai/gpt-oss-120b/raw | @cf/openai/gpt-oss-120b/compiled | @cf/qwen/qwen3-30b-a3b-fp8/raw | @cf/qwen/qwen3-30b-a3b-fp8/compiled | claude-opus-4-7/raw | claude-opus-4-7/compiled | gemini-3.1-pro-preview/raw | gemini-3.1-pro-preview/compiled | gpt-5.4/raw | gpt-5.4/compiled | gpt-5.5/raw | gpt-5.5/compiled |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ahd/a11y/heading-skip | 0% | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 3% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 4% | 0% | 0% | 0% | 0% |
| ahd/a11y/img-without-alt | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/body-measure | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 3% | 0% | 7% |
| ahd/footer-not-four-col | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 10% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/line-height-per-size | 83% | 0% | 0% | 20% | 13% | 100% | 53% | 97% | 0% | 0% | 100% | 27% | 53% | 97% | 0% | 3% | 80% | 4% | 3% | 10% | 0% | 0% |
| ahd/no-default-grotesque | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 10% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/no-em-dashes-in-prose | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 7% | 80% | 83% | 0% | 0% | 0% | 0% | 80% | 73% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/no-flat-dark-mode | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 27% | 0% | 0% | 0% | 0% | 0% |
| ahd/no-indiscriminate-glass | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 23% | 0% | 0% | 0% |
| ahd/no-shimmer-decoration | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 0% | 0% | 20% | 3% | 0% | 4% | 0% | 0% | 0% | 0% |
| ahd/no-slop-copy | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 10% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/require-named-grid | 3% | 27% | 10% | 3% | 90% | 0% | 100% | 17% | 63% | 3% | 40% | 43% | 0% | 3% | 0% | 0% | 13% | 46% | 0% | 0% | 0% | 0% |
| ahd/respect-reduced-motion | 0% | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 33% | 0% | 0% | 0% | 0% | 10% | 97% | 0% | 27% | 7% | 37% | 0% | 30% |
| ahd/svg/no-perfect-symmetry | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/svg/palette-bounds | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 33% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/tracking-per-size | 0% | 3% | 0% | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 4% | 0% | 0% | 37% | 3% |

## Caveats
- The headline is lint violations reduced, not design quality improved. The compiler teaches the conventions the linter rewards, so a fall in fires is evidence of compliance with AHD, not by itself evidence of a better page.
- Scoring runs the deterministic AHD linter (38 source-level rules) over every sample that passes a basic HTML sanity check.
- Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.
- Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.
- Vision-only tells (14 rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.
- Estimator: a Welch t interval on the difference of per-page mean counts, raw minus compiled, degrees of freedom by Welch-Satterthwaite, 99.5% two-sided. Each arm's variance is floored at the largest value of s(1 - s) over the Wilson interval at this level for the share of pages in the arm with a count of at least one, so an arm that never varies, whether at zero or at a constant nonzero count, does not carry zero uncertainty. A BCa bootstrap over the same per-sample counts is computed as a cross-check; it is never rendered where a verdict is read and never decides one. Whether this is persisted with the run depends on whether the run has a replay block; see the note above the per-model table.
- A stratum whose raw mean sits below 0.5 tells per sample reports its ratio as not estimable rather than as a percentage; the verdict, which reads the absolute difference, is unaffected.
- Model versions change. See the run manifest for the canonical model ids as reported by each provider.