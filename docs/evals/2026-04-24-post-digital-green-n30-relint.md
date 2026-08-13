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
repository, so anyone who clones it can regenerate this file and check the
figures below. Those figures came from v0.11.0, roughly four months after
the run, and match the numbers published on the 24 April eval page to the
decimal. No rule change after the v0.9 correction has moved them.

## Verdict shift, by cell

| model | pre-fix Δ | post-fix Δ | direction |
|---|---:|---:|---|
| `@cf/google/gemma-4-26b-a4b-it` | -10.5% | **+50.0%** | flipped positive |
| `@cf/openai/gpt-oss-120b` | +19.8% | **+47.6%** | more than doubled |
| `@cf/moonshotai/kimi-k2.6` | -14.4% | **+30.5%** | flipped positive |
| `gemini-3.1-pro-preview` | -9.9% | **+26.3%** | flipped positive |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | +34.7% | +21.7% | positive, smaller margin |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | +4.8% | +3.2% | flat in both readings |
| `gpt-5.5` | -135.5% | -9.1% | regression nearly closed |
| `gpt-5.4` | -78.6% | -36.4% | regression roughly halved |
| `claude-opus-4-7` | -172.9% | -67.6% | still regressed, 60 percent closed |
| `@cf/qwen/qwen3-30b-a3b-fp8` | -17.6% | -87.5% | worse, see below |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | -100.0% | -200.0% | worse, see below |

Six cells are positive where three were before.

## What the fix did not solve

Five cells still regress, and two of them look worse than they did.

Llama 3.3 sits at the lowest absolute baseline in the run, 0.10 raw against
0.30 compiled. An increase of 0.20 tells per page reads as -200 percent
while saying almost nothing about the model. Qwen3 has a milder version of
the same problem: a 0.53 baseline still inflates a 0.47 increase into -87.5
percent. Percentages taken against a baseline this small are noise wearing
a decimal point, and both cells should be read from the mean columns rather
than the reduction column.

The frontier cells are a real finding rather than an artefact. Claude,
gpt-5.4 and gpt-5.5 still regress because rules outside the token's
suppression list are firing on their compiled output.
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

## Per-model slop reduction

| model | raw attempted → scored | compiled attempted → scored | raw mean tells | compiled mean tells | Δ | reduction |
|---|---:|---:|---:|---:|---:|---:|
| `@cf/google/gemma-4-26b-a4b-it` | 30 → 30 | 30 → 30 | 0.87 | 0.43 | 0.43 | 50.0% |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 30 → 30 | 30 → 30 | 0.10 | 0.30 | -0.20 | -200.0% |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 30 → 30 | 30 → 30 | 1.03 | 1.00 | 0.03 | 3.2% |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 → 30 | 30 → 30 | 1.53 | 1.20 | 0.33 | 21.7% |
| `@cf/moonshotai/kimi-k2.6` | 30 → 30 | 30 → 30 | 1.97 | 1.37 | 0.60 | 30.5% |
| `@cf/openai/gpt-oss-120b` | 30 → 30 | 30 → 30 | 1.40 | 0.73 | 0.67 | 47.6% |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 30 → 30 | 30 → 30 | 0.53 | 1.00 | -0.47 | -87.5% |
| `claude-opus-4-7` | 30 → 30 | 30 → 30 | 1.13 | 1.90 | -0.77 | -67.6% |
| `gemini-3.1-pro-preview` | 30 → 30 | 30 → 26 | 1.20 | 0.88 | 0.32 | 26.3% |
| `gpt-5.4` | 30 → 30 | 30 → 30 | 0.37 | 0.50 | -0.13 | -36.4% |
| `gpt-5.5` | 30 → 30 | 30 → 30 | 0.37 | 0.40 | -0.03 | -9.1% |

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
- Scoring runs the deterministic AHD linter (38 source-level rules) over every sample that passes a basic HTML sanity check.
- Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.
- Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.
- Vision-only tells (14 rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.
- Tells-per-page is a proxy metric: a thin page has little surface for rules to fire against. Read the Δ alongside the actual rendered HTML, not in isolation.
- Model versions change. See the run manifest for exact canonical model ids.