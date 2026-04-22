# ahd eval · swiss-editorial · 2026-04-22T02:16:35.535Z

## Run

- Brief: `briefs/landing.yml`
- Samples per cell: **5**
- Max tokens: 12000
- Models:
  - `meta-llama/Llama-3.3-70B-Instruct` (huggingface) · spec `hf:meta-llama/Llama-3.3-70B-Instruct`
  - `Qwen/Qwen3-8B` (huggingface) · spec `hf:Qwen/Qwen3-8B`
  - `deepseek-ai/DeepSeek-R1` (huggingface) · spec `hf:deepseek-ai/DeepSeek-R1`
  - `@cf/mistralai/mistral-small-3.1-24b-instruct` (cloudflare-workers-ai) · spec `cf:@cf/mistralai/mistral-small-3.1-24b-instruct`
  - `claude-opus-4-7` (anthropic) · spec `claude-opus-4-7`

## Per-model slop reduction

| model | raw attempted → scored | compiled attempted → scored | raw mean tells | compiled mean tells | Δ | reduction |
|---|---:|---:|---:|---:|---:|---:|
| `Qwen/Qwen3-8B` | 5 → 5 | 5 → 5 | 1.80 | 2.60 | -0.80 | -44.4% |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 5 → 5 | 5 → 5 | 3.40 | 1.40 | 2.00 | 58.8% |
| `claude-opus-4-7` | 5 → 5 | 5 → 5 | 1.40 | 0.80 | 0.60 | 42.9% |
| `deepseek-ai/DeepSeek-R1` | 5 → 3 | 5 → 3 | 2.00 | 1.00 | 1.00 | 50.0% |
| `gemini-2.5-pro` | 5 → 4 | 5 → 0 | 2.75 | — | — | inconclusive |
| `gpt-5-codex` | 5 → 5 | 5 → 5 | 1.40 | 0.40 | 1.00 | 71.4% |
| `meta-llama/Llama-3.3-70B-Instruct` | 5 → 5 | 5 → 5 | 0.40 | 1.20 | -0.80 | -200.0% |

## Per-tell frequency (scored samples only)

| tell | Qwen/Qwen3-8B/raw | Qwen/Qwen3-8B/compiled | @cf/mistralai/mistral-small-3.1-24b-instruct/raw | @cf/mistralai/mistral-small-3.1-24b-instruct/compiled | claude-opus-4-7/raw | claude-opus-4-7/compiled | deepseek-ai/DeepSeek-R1/raw | deepseek-ai/DeepSeek-R1/compiled | gemini-2.5-pro/raw | gemini-2.5-pro/compiled | gpt-5-codex/raw | gpt-5-codex/compiled | meta-llama/Llama-3.3-70B-Instruct/raw | meta-llama/Llama-3.3-70B-Instruct/compiled |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ahd/footer-not-four-col | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 20% | 0% | 0% |
| ahd/line-height-per-size | 100% | 80% | 60% | 20% | 0% | 0% | 67% | 0% | 100% | 0% | 0% | 0% | 0% | 40% |
| ahd/no-default-grotesque | 0% | 0% | 0% | 20% | 0% | 0% | 33% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/no-shimmer-decoration | 0% | 0% | 0% | 0% | 20% | 20% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/no-slop-copy | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 67% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/radius-hierarchy | 60% | 60% | 100% | 0% | 40% | 0% | 33% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ahd/require-named-grid | 0% | 20% | 100% | 20% | 0% | 0% | 0% | 33% | 25% | 0% | 0% | 0% | 40% | 60% |
| ahd/require-type-pairing | 20% | 0% | 80% | 0% | 0% | 0% | 0% | 0% | 50% | 0% | 0% | 0% | 0% | 20% |
| ahd/tracking-per-size | 0% | 60% | 0% | 60% | 0% | 60% | 0% | 0% | 0% | 0% | 80% | 0% | 0% | 0% |
| ahd/weight-variety | 0% | 40% | 0% | 20% | 80% | 0% | 67% | 0% | 100% | 0% | 60% | 20% | 0% | 0% |

## Caveats
- Scoring runs the deterministic AHD linter (31 source-level rules) over every sample that passes a basic HTML sanity check.
- Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.
- Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.
- Vision-only tells (9 rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.
- Tells-per-page is a proxy metric: a thin page has little surface for rules to fire against. Read the Δ alongside the actual rendered HTML, not in isolation.
- Model versions change. See the run manifest for exact canonical model ids.