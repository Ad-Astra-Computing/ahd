# Roadmap

Source of truth for what's shipped, what's scaffolded, and what's gated on external resources.

## v0.1 — shipped

- `ahd compile` CLI: brief + style token → `spec.json` + per-model prompts
- Style-token schema and validator (`zod`-backed)
- Slop taxonomy documented (38 tells: 28 source-checkable, 9 vision-only)
- Dogfooded README artwork rendered against `swiss-editorial`
- Nix flake for reproducible builds of the `ahd` binary
- TypeScript → `dist/` build via `tsc`

## v0.2 — shipped

- `ahd lint <file.html|css>` with **28 source-level rules**
- Slop-fixture and clean-fixture HTML corpus with per-rule assertions
- `ahd eval <token> --samples <dir>` scoring across pre-rendered samples
- Per-cell attempted / errored / extractionFailed / scored counts, canonical model ids via `evals/<token>/manifest.json`

## v0.3 — shipped

- `ahd eval-live` end-to-end pipeline: brief → compile → per-model calls → score → report
- Runners: **Anthropic** (Claude), **OpenAI** (GPT / o-series), **Google** (Gemini), **Cloudflare Workers AI** (Llama 3.3 / Llama 4 / DeepSeek R1 / Qwen QwQ / Mistral via `cf:@cf/vendor/model`), **Ollama** (local OSS)
- CF AI Gateway routing via `CF_AI_GATEWAY` env for caching / rate-limit / spend tracking on frontier-provider calls
- Deterministic **mock runners** (`mock-slop`, `mock-swiss`) for offline testing of the full pipeline
- Runners respect env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `CF_API_TOKEN` + `CF_ACCOUNT_ID`
- Controlled methodology: raw condition gets full brief-as-prose, compiled condition adds only the AHD system prompt
- Compile `draft | final` modes; eval uses `final` to prevent "three divergent directions" fighting single-output constraints
- Measured run published 21 April 2026: [docs/evals/2026-04-21-swiss.md](evals/2026-04-21-swiss.md)

## v0.4 — shipped

- **Vision critic** (`ahd critique`) — renders each sample via headless Chromium, runs multimodal critic over the 9 vision-only rules
- Rate-limit-aware retry / exponential backoff; default model `claude-haiku-4-5` for higher rate ceilings
- Anthropic vision adapter + mock critic for deterministic tests
- Partial run published 21 April 2026 (21 of 48 samples, rate-limit bound): [docs/evals/2026-04-21-swiss-vision.md](evals/2026-04-21-swiss-vision.md)
- **MCP server** (`ahd mcp-serve`): 8 tools over stdio JSON-RPC, full initialize / tools/list / tools/call lifecycle tested
- Chromium resolved via `AHD_CHROMIUM_PATH` / `PATH`; nix flake devShell provides `pkgs.chromium`

## v0.5 — shipped partially

- Eight style tokens: `swiss-editorial`, `manual-sf`, `neubrutalist-gumroad`, `post-digital-green`, `memphis-clash` (draft), `heisei-retro` (draft), `monochrome-editorial`, `bauhaus-revival` (draft)
- `eslint-plugin-ahd` + `stylelint-plugin-ahd` wrappers derived from the rule engine
- **Not yet shipped as standalone npm packages** (currently ride with `@adastra/ahd`); splitting is a packaging task
- Community contribution flow (DCO, review sign-off policy) still to write

## v0.6 — image generation vertical (planned)

Closes the "across web and image" promise. The taxonomy and vision critic already span it; only runners and the eval pipeline are web-specific today.

- **Image-generation runners** with the same `ModelRunner` interface:
  - Anthropic / OpenAI image models (DALL·E 3, gpt-image-1)
  - Google Imagen 3
  - Adobe Firefly
  - Replicate (FLUX.1 schnell / dev / pro, SDXL, Ideogram)
  - Cloudflare Workers AI image models: `@cf/black-forest-labs/flux-1-schnell`, `@cf/bytedance/stable-diffusion-xl-lightning`, `@cf/lykon/dreamshaper-8-lcm`
  - Midjourney via proxy (community pattern)
- **`ahd eval-image`** — image-first eval pipeline: saves generated PNGs directly, no HTML intermediary, scored by the vision critic against illustration / graphic tells
- **Extended taxonomy** — tells specific to image generation: six-finger hands, shiny 3D-blob characters, Midjourney face-symmetry, over-sampled rule-of-thirds, decorative cursive in renders. Each with exemplars and critic prompt.
- **SVG / vector linter** — source-level checker for SVG output: monoline-uniform stroke, symmetry heuristics, palette-bounds against the token's OKLCH palette
- **Image-surface style tokens** — `editorial-photo`, `product-shot`, `ad-creative`, `zine-collage` etc., calibrated for image generators rather than web

## v0.7 — larger-n, peer-reviewable eval

The 21 April 2026 run is n=5 per cell with wide confidence intervals. A credible benchmark run needs:

- n ≥ 30 per cell
- Bootstrap confidence intervals on all reported deltas
- Seed rotation for variance estimate
- Multiple briefs (landing, portfolio, docs, dashboard, editorial, data-viz) per token
- Results published in `docs/evals/<date>-<token>-<n>.md` with the run manifest committed alongside

Budget is the gate, not engineering.

## Later

- Figma plugin that reads `.ahd/brief.yml` and lints frames in the canvas
- Vision-critic pipeline on PR screenshots in CI with inline slop-tell comments
- `ahd serve` — preview server that hot-reloads brief and output side by side
- Public npm packages for `eslint-plugin-ahd` and `stylelint-plugin-ahd`
- `ahd-mcp` published to the MCP registry
- Token graduation policy (`draft` → `stable` after three independent sign-offs and one downstream public project usage)

## Known blockers

1. **Live eval budget for n=30.** Substrate ready, budget is the gate.
2. **Full vision coverage** — rate-limit retry now in place, re-run will finish all 48 samples.
3. **Image runners** — no engineering blockers; a v0.6 sprint.

## How to unblock

Drop the relevant keys in `.env`. Run:

```
# OSS only, free tier
CF_API_TOKEN=… CF_ACCOUNT_ID=… \
  ahd eval-live swiss-editorial --brief briefs/landing.yml \
    --models cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast,cf:@cf/mistralai/mistral-small-3.1-24b-instruct \
    --n 30

# Full sweep
ahd eval-live swiss-editorial --brief briefs/landing.yml \
  --models claude-opus-4-7,gpt-5,gemini-3-pro,cf:@cf/mistralai/mistral-small-3.1-24b-instruct,cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast \
  --n 30 --report docs/evals/$(date +%Y-%m-%d)-swiss-n30.md
```
