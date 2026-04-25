# ahd eval · post-digital-green · 2026-04-25T04:19:45.259Z

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
| `@cf/google/gemma-4-26b-a4b-it` | 30 → 30 | 30 → 30 | 2.53 | 2.80 | -0.27 | -10.5% |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 30 → 30 | 30 → 30 | 0.30 | 0.60 | -0.30 | -100.0% |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 30 → 30 | 30 → 30 | 2.10 | 2.00 | 0.10 | 4.8% |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 → 30 | 30 → 30 | 3.37 | 2.20 | 1.17 | 34.7% |
| `@cf/moonshotai/kimi-k2.6` | 30 → 30 | 30 → 30 | 3.00 | 3.43 | -0.43 | -14.4% |
| `@cf/openai/gpt-oss-120b` | 30 → 30 | 30 → 30 | 3.03 | 2.43 | 0.60 | 19.8% |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 30 → 30 | 30 → 30 | 1.70 | 2.00 | -0.30 | -17.6% |
| `claude-opus-4-7` | 30 → 30 | 30 → 30 | 1.60 | 4.37 | -2.77 | -172.9% |
| `gemini-3.1-pro-preview` | 30 → 30 | 30 → 26 | 2.80 | 3.08 | -0.28 | -9.9% |
| `gpt-5.4` | 30 → 30 | 30 → 30 | 1.40 | 2.50 | -1.10 | -78.6% |
| `gpt-5.5` | 30 → 30 | 30 → 30 | 1.03 | 2.43 | -1.40 | -135.5% |

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
| ahd/radius-hierarchy | 47% | 43% | 3% | 0% | 7% | 0% | 100% | 0% | 10% | 13% | 57% | 0% | 17% | 0% | 37% | 47% | 37% | 31% | 3% | 3% | 7% | 3% |
| ahd/require-named-grid | 3% | 27% | 10% | 3% | 90% | 0% | 100% | 17% | 63% | 3% | 40% | 43% | 0% | 3% | 0% | 0% | 13% | 46% | 0% | 0% | 0% | 0% |
| ahd/require-type-pairing | 20% | 97% | 17% | 30% | 100% | 100% | 83% | 100% | 7% | 93% | 43% | 100% | 93% | 100% | 0% | 100% | 30% | 92% | 10% | 100% | 0% | 100% |
| ahd/respect-reduced-motion | 0% | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 33% | 0% | 0% | 0% | 0% | 10% | 97% | 0% | 27% | 7% | 37% | 0% | 30% |
| ahd/svg/no-perfect-symmetry | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/svg/palette-bounds | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 33% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/tracking-per-size | 0% | 3% | 0% | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 3% | 0% | 0% | 4% | 0% | 0% | 37% | 3% |
| ahd/weight-variety | 100% | 97% | 0% | 0% | 0% | 0% | 0% | 0% | 87% | 100% | 63% | 70% | 7% | 0% | 10% | 100% | 93% | 96% | 90% | 97% | 60% | 100% |

## Caveats
- Scoring runs the deterministic AHD linter (38 source-level rules) over every sample that passes a basic HTML sanity check.
- Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.
- Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.
- Vision-only tells (14 rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.
- Tells-per-page is a proxy metric: a thin page has little surface for rules to fire against. Read the Δ alongside the actual rendered HTML, not in isolation.
- Model versions change. See the run manifest for exact canonical model ids.