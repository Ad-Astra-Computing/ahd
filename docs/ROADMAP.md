# Roadmap

Source of truth for what's shipped, what's scaffolded, and what's gated on external resources.

## v0.1 — shipped

- `ahd compile` CLI: brief + style token → `spec.json` + per-model prompts
- Style-token schema and validator (`zod`-backed)
- Slop taxonomy documented (39 tells, enforced by 35 HTML/CSS rules, 3 SVG rules, and 14 vision-critic rules)
- Dogfooded README artwork rendered against `swiss-editorial`
- Nix flake for reproducible builds of the `ahd` binary
- TypeScript → `dist/` build via `tsc`

## v0.2 — shipped

- `ahd lint <file.html|css>` with **35 source-level rules**
- Slop-fixture and clean-fixture HTML corpus with per-rule assertions
- `ahd eval <token> --samples <dir>` scoring across pre-rendered samples
- Per-cell attempted / errored / extractionFailed / scored counts, canonical model ids via `evals/<token>/manifest.json`

## v0.3 — shipped

- `ahd eval-live` end-to-end pipeline: brief → compile → per-model calls → score → report
- Runners: **Anthropic** (Claude), **OpenAI** (GPT / o-series), **Google** (Gemini), **Cloudflare Workers AI** (Llama 3.3 / Llama 4 / DeepSeek R1 / Qwen QwQ / Mistral via `cf:@cf/vendor/model`), **Ollama** (local OSS via `ollama:<model>` spec, remote via `OLLAMA_HOST` env). Ollama verified end-to-end on 21 April 2026 against a CPU-backend daemon running qwen2.5:0.5b — ran through `ahd try`, linter scored the output against all thirty-one source rules. Known upstream Ollama issue on AMD Strix Halo / Radeon 8060S (gfx1151): the default ROCm backend crashes during post-load GPU discovery and the llama runner exits (exit status 2). Workaround: force CPU via `HIP_VISIBLE_DEVICES=""`, `ROCR_VISIBLE_DEVICES=""`, `OLLAMA_LLM_LIBRARY=cpu`. Tracked for upstream resolution as the ROCm runtime grows real gfx1151 support.
- CF AI Gateway routing via `CF_AI_GATEWAY` env for caching / rate-limit / spend tracking on frontier-provider calls
- Deterministic **mock runners** (`mock-slop`, `mock-swiss`) for offline testing of the full pipeline
- Runners respect env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `CF_API_TOKEN` + `CF_ACCOUNT_ID`
- Controlled methodology: raw condition gets full brief-as-prose, compiled condition adds only the AHD system prompt
- Compile `draft | final` modes; eval uses `final` to prevent "three divergent directions" fighting single-output constraints
- Measured run published 21 April 2026: [2026-04-21-swiss.md](./evals/2026-04-21-swiss.md)

## v0.4 — shipped

- **Vision critic** (`ahd critique`) — renders each sample via headless Chromium, runs multimodal critic over 14 vision rules (9 web/graphic + 4 image-specific + 1 layout)
- Rate-limit-aware retry / exponential backoff; default model `claude-haiku-4-5` for higher rate ceilings
- Anthropic vision adapter + mock critic for deterministic tests
- Partial run published 21 April 2026 (21 of 48 samples, rate-limit bound): [2026-04-21-swiss-vision.md](./evals/2026-04-21-swiss-vision.md)
- **MCP server** (`ahd mcp-serve`): 8 tools over stdio JSON-RPC, full initialize / tools/list / tools/call lifecycle tested
- Chromium resolved via `AHD_CHROMIUM_PATH` / `PATH`; nix flake devShell provides `pkgs.chromium`

## v0.5 — shipped

- Ten style tokens: `swiss-editorial`, `manual-sf`, `neubrutalist-gumroad`, `post-digital-green`, `memphis-clash` (draft), `heisei-retro` (draft), `monochrome-editorial`, `bauhaus-revival` (draft), `editorial-illustration` (draft), `ad-creative-collision` (draft)
- `eslint-plugin-ahd` + `stylelint-plugin-ahd` split into standalone packages under `packages/`, derived programmatically from the shared rule engine in `@adastracomputing/ahd`
- Community contribution flow shipped: [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [SECURITY.md](../SECURITY.md), issue templates, PR template, DCO sign-off requirement
- Per-token exemplar references under `tokens/exemplars/*/reference.md` sourced from public-domain archives (Wikimedia, LOC, MoMA Open Access, Rijksmuseum, Cooper Hewitt, Letterform Archive)

## v0.6 — image generation vertical · shipped

- **Image-generation runner** for Cloudflare Workers AI image models via `cfimg:<@cf/vendor/model>` specs (FLUX.1 schnell, SDXL Lightning, SDXL base, DreamShaper). Same `ImageRunner` interface shape as the text runners.
- **`ahd eval-image`** — image-first eval pipeline saves generated PNGs directly with no HTML intermediary, scored by the vision critic against illustration and graphic tells. `--critic mock|anthropic` flag added to the CLI so users without `ANTHROPIC_API_KEY` can score offline rather than getting a report full of `.critique-error.txt` files.
- **`ahd try-image`** — single-shot image demo command, parallel to `ahd try` for text.
- **SVG / vector linter** — three source-level rules shipped (`ahd/svg/no-uniform-stroke`, `ahd/svg/palette-bounds`, `ahd/svg/no-perfect-symmetry`). Engine runs them automatically when the input contains an `<svg>`.
- **Four image-specific vision rules** added to the critic: `ahd/image/no-malformed-anatomy`, `ahd/image/no-midjourney-face-symmetry`, `ahd/image/no-decorative-cursive-in-render`, `ahd/image/no-stock-diversity-casting`. Total vision ruleset is fourteen.
- **Two image-surface style tokens** (`editorial-illustration`, `ad-creative-collision`) authored for image prompts, not web layouts. `compileImagePrompt` emits a positive + negative prompt pair rather than an HTML system prompt.
- **Measured image run** published 21 April 2026 with real numbers: FLUX.1 schnell dropped 50% of vision tells compiled vs raw (Corporate Memphis fires: 67% → 0%); SDXL Lightning ignored the negative and stayed put. See `docs/evals/2026-04-21-editorial-image.md`.

## v0.6.x — image generation follow-ups (not yet shipped)

- Additional runners: Replicate (FLUX.1 dev / pro, Ideogram), OpenAI gpt-image-1 / DALL·E 3, Google Imagen 3, Adobe Firefly, Midjourney proxy.
- Expanded image-specific taxonomy: hand-anatomy family (distinct from generic malformed anatomy), shiny 3D-blob characters as a distinct tell, over-sampled rule-of-thirds composition, decorative cursive specifically in product shots.
- More image-surface tokens: `editorial-photo`, `product-shot`, `zine-collage`.

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
3. **Additional image runners** — Cloudflare Workers AI image models ship today (FLUX, SDXL, DreamShaper). Replicate, OpenAI gpt-image-1 / DALL·E 3, Imagen, Firefly and Midjourney proxy are a v0.6.x sprint. No engineering blockers.

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
