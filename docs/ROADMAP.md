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

## v0.7 — subscription-CLI runners · shipped

- **Claude Code, Codex and Gemini CLI runners** added alongside the API-key runners. Each invokes the provider's official CLI binary in non-interactive mode (`claude --print`, `codex exec`, `gemini --json`), captures the model output, and threads it through the same scoring pipeline as the API path.
- The CLI variants reflect the path most humans actually use for these models today, so eval reports include both API and CLI cells where comparison matters. Documented as a methodology note: CLI output is not bit-identical to the corresponding `/v1/messages` call because each CLI adds its own framing layer even with tools disabled.
- Subscription-auth env preservation: runner allow-list now keeps `USER`, `LOGNAME`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, plus per-CLI auth variables, so keychain-backed subscription auth (Claude Code, Codex on ChatGPT) works inside the runner sandbox.

## v0.8 — n=30 evals + per-sample viewer · shipped

- **n=30 publishable runs** with attempted-vs-scored counts, Wilson confidence intervals, per-tell frequency tables, and full canonical model identifiers in the run manifest.
- First n=30 swiss-editorial run published 22 April 2026: ten models, six hundred samples, eight cells positive. See [2026-04-22-swiss-n30.md](./evals/2026-04-22-swiss-n30.md).
- First different-token-same-brief triangulation published 24 April 2026: eleven models against `post-digital-green`, six hundred sixty samples. See [2026-04-24-post-digital-green-n30.md](./evals/2026-04-24-post-digital-green-n30.md).
- **Per-sample viewer** at `/evals/<run-date>/samples/<cell>/<condition>/<id>` renders every shipped sample with linter violations attached to source lines and the rendered HTML in a sandboxed frame. Each published claim traces to the bytes it scored against.
- **Vision critic infrastructure** stabilised: rate-limit retry, auth env preservation, parse-failure handling now emits an explicit `ahd/critic-parse-failed` violation rather than silently returning an empty array.
- **Mobile-layout audit** (`ahd audit-mobile`) launched with four rules at the 375px viewport: viewport-meta-present, no-horizontal-overflow, tap-target-size, body-font-size.

## v0.9 — token-aware lint, manifest contract, governance · shipped

- **Token-aware linting**. Each style token may declare a `lint-overrides.disable` block naming the rules it intentionally rejects. The compiler emits `<meta name="ahd-token" content="<id>">` in compiled output; the linter reads the active token from the meta anchor (or from an explicit `--token` flag) and silences declared rules. The token-aware re-lint addendum on the 24 April page documents the verdict shift.
- **Manifest schema as executable contract**. `schema/manifest.current.schema.json` and `schema/manifest.target.schema.json` (generated from a Zod source of truth in `src/eval/types.ts`) describe the submission envelope at two compliance tiers. New CLI: `ahd validate-submission <dir>` parses a contribution against both schemas and reports current pass + target warnings.
- **Agent contribution contract**. `CONTRIBUTING-AGENTS.md` and the corresponding `/evals/contribute/agents` page give autonomous tooling (Claude Code, Codex, Cursor, Aider) a deterministic surface to read before submitting an eval run, with the trust gate (re-lint on receipt) explicitly named as the enforcement layer rather than a social handshake.
- **Plugin perf refactor**. `eslint-plugin-ahd` and `stylelint-plugin-ahd` now lint each file once per pass and dispatch the cached violations to per-rule handlers, rather than re-running the full linter for every enabled rule. Roughly N× speedup where N is the enabled-rule count.
- **MCP error model + input validation**. Distinct JSON-RPC error codes (parse / invalid-request / method-not-found / invalid-params / tool-invocation), request id preserved on every non-parse error, every tool's args validated by a per-tool Zod schema at the boundary.
- **CLI numeric-flag validation**. New `intFlag` helper rejects NaN, non-integer, decimal and out-of-range values at the boundary rather than letting them degrade into confusing downstream behaviour. Each call site declares its bounds explicitly.
- **Mobile rule expansion**. Fifth mobile rule landed: `ahd/mobile/scrollable-no-affordance` (experimental). Detects horizontally-scrollable regions that hide their scrollbar without a replacement cue (scroll-snap, edge-fade mask, or `data-scroll-affordance` opt-out).
- **Flake auto-sync CI**. `.github/workflows/flake-sync.yml` keeps `flake.nix` version + `npmDepsHash` in lockstep with `package.json` and `package-lock.json` on every push to main; the release workflow runs the same bump atomically so release tags point at a tree where `nix build` succeeds.
- **Rule governance Layer 1 + 3**. `rules.manifest.json` at the repo root catalogues every shipped rule (id, engine, surface, severity, status, introducedAt) and is generated from code at build time, with a parity test asserting the file matches the rule arrays. Rules now carry a `status` field (experimental | stable | deprecated); experimental and deprecated rules are excluded from the eslint-plugin recommended config so consumers opt in explicitly.

## v0.10 — governance Layer 2 + external validity (planned)

- **Calibration as data, not vibes** (rule governance Layer 2). Held-out fixture corpus + nightly job that runs the eval pipeline and writes per-rule false-positive rate distributions to a `calibration.json` artefact in the repo. Rules whose FP rate breaches a configurable threshold auto-flag as "needs review" and are eligible for status downgrade. Promotes rule quality from intuition to a measurable property the doc-vs-code parity CI can also assert on.
- **Doc-vs-code parity CI**. CI check that asserts every rule id in `LINTER_SPEC.md` exists in `rules.manifest.json` (and vice versa); every URL in `public/llms.txt` resolves to a built page; every `ahd <command>` referenced in `README.md` exists in the CLI surface; rule counts cited on the site match the manifest's recorded `counts.byEngine`. Drift fails the build before merge.
- **Different-brief-same-token triangulation**. Run the same model roster against multiple briefs (landing, portfolio, docs, dashboard, editorial, data-viz) under one token to test the second external-validity axis (the 24 April run tested the first).
- **Vision-critic coverage on existing samples**. Run the vision critic against the published 22 April and 24 April sample bytes so the per-tell table can include vision rules alongside source rules in the same report.
- **Image-gen at n=30**. The 21 April editorial-illustration run was n=3. Production-quality image-gen evals need the same n=30 + Wilson interval treatment text evals already get. Budget is the primary gate.

## Later

- Additional image runners: Replicate (FLUX.1 dev / pro, Ideogram), OpenAI gpt-image-1 / DALL·E 3, Google Imagen 3, Adobe Firefly, Midjourney proxy.
- Expanded image-specific taxonomy: hand-anatomy family (distinct from generic malformed anatomy), shiny 3D-blob characters as a distinct tell, over-sampled rule-of-thirds composition, decorative cursive specifically in product shots.
- More image-surface tokens: `editorial-photo`, `product-shot`, `zine-collage`.
- Figma plugin that reads `.ahd/brief.yml` and lints frames in the canvas.
- Vision-critic pipeline on PR screenshots in CI with inline slop-tell comments.
- `ahd serve` preview server that hot-reloads brief and output side by side.
- Per-path / per-glob lint overrides (currently overrides are repo-scoped).
- `ahd audit` subcommand to enumerate every active override across the repo.
- Token graduation policy (`draft` → `stable` after three independent sign-offs and one downstream public project usage).
- Shared analysis core extraction (`@adastracomputing/ahd-core`) once adoption flows through plugins / MCP rather than direct CLI; tracked so the boundary doesn't get papered over as the wrappers grow.

## Known blockers

1. **Image-gen n=30 budget.** Vision-critic API cost at thirty samples per cell across several image models lands in the low-three-figure range per run. Substrate ready, budget is the gate.
2. **Calibration corpus design.** Rule governance Layer 2 needs a held-out fixture set with vision-critic-derived ground truth. The fixture set itself is a small engineering project, but it has to be designed before nightly calibration runs are useful.
3. **Additional image runners.** Cloudflare Workers AI image models ship today (FLUX, SDXL, DreamShaper). Replicate, OpenAI gpt-image-1 / DALL·E 3, Imagen, Firefly and Midjourney proxy are a follow-up sprint. No engineering blockers.

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
