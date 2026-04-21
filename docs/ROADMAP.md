# Roadmap

Source of truth for what's shipped, what's scaffolded, and what's blocked on external resources.

## v0.1 — shipped

- `ahd compile` CLI: brief + style token → `spec.json` + per-model prompts (Claude, GPT, Gemini, generic)
- Style-token schema and validator, `zod`-backed
- Slop taxonomy (38 tells) documented
- Linter rule spec documented
- Dogfooded README artwork rendered against `swiss-editorial`
- Nix flake for reproducible builds — verified green
- TypeScript → `dist/` build via `tsc`

## v0.2 — shipped

Linter core plus eval scaffold.

- `ahd lint <file.html|css>` with **28 source-level rules** covering the taxonomy's source-checkable tells:
  `no-default-grotesque`, `no-purple-blue-gradient`, `no-emoji-bullets`,
  `no-gradient-text`, `no-slop-copy`, `weight-variety`, `require-type-pairing`,
  `no-fake-testimonials`, `no-flat-dark-mode`, `no-shimmer-decoration`,
  `no-uniform-radius`, `no-three-equal-cards`, `no-lucide-in-rounded-square`,
  `no-indiscriminate-glass`, `single-shadow-style`, `no-centered-hero`,
  `respect-reduced-motion`, `line-height-per-size`, `body-measure`,
  `require-named-grid`, `no-default-spline`, `pricing-not-three`,
  `footer-not-four-col`, `motion-has-intent`, `no-fake-trust-bar`,
  `cta-not-canonical`, `tracking-per-size`, `radius-hierarchy`
- Slop-fixture and clean-fixture HTML in `tests/fixtures/` with per-rule assertions
- `ahd eval <token> --samples <dir>` — aggregates lint scores across pre-rendered samples
- Per-model delta and per-tell frequency reporting, Markdown output

## v0.3 — shipped as scaffold, live runs gated on API keys

- `ahd eval-live` end-to-end pipeline: brief → compile → per-model calls → save samples → score → report
- Model runners for **Anthropic** (Claude), **OpenAI** (GPT / o-series), **Google** (Gemini), **Ollama** (local OSS: Llama, DeepSeek, Qwen, etc.)
- Deterministic **mock runners** (`mock-slop`, `mock-swiss`) for offline testing of the full pipeline — covered in `tests/runners.test.ts`
- Runners respect env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`
- Blocked on external: live runs require keys and budget — drop them in `.env` and `ahd eval-live swiss-editorial --brief b.yml --models claude-opus-4-7,gpt-5,gemini-3-pro --n 10` runs the real thing

## v0.4 — shipped as scaffold, live critic gated on API keys

- **MCP server** (`ahd mcp-serve` / `ahd-mcp` binary): stdio JSON-RPC exposing
  `ahd.list_tokens`, `ahd.get_token`, `ahd.brief`, `ahd.palette`,
  `ahd.type_system`, `ahd.reference`, `ahd.lint`, `ahd.vision_rules`.
  Tested against a full initialize / tools/list / tools/call lifecycle.
- **Vision critic** (`src/critique/critic.ts`) with the **9 vision-only rules**
  (`require-asymmetry`, `bento-has-anchor`, `no-corporate-memphis`,
  `no-ai-illustration`, `no-iridescent-blob`, `no-laptop-office-stock`,
  `mesh-has-counterforce`, `wordmark-not-dot-grotesque`,
  `icons-not-monoline-default`). Prompt builder + Anthropic image-input
  adapter + mock critic for deterministic tests.
- Blocked on external: live critic needs a multimodal API key.

## v0.5 — shipped partially

- Eight style tokens now: `swiss-editorial`, `manual-sf`,
  `neubrutalist-gumroad`, `post-digital-green`, `memphis-clash` (draft),
  `heisei-retro` (draft), `monochrome-editorial`, `bauhaus-revival` (draft).
- **`eslint-plugin-ahd`** and **`stylelint-plugin-ahd`** wrappers built in
  `src/plugins/`, each programmatically derived from the rule engine.
- Not yet shipped as standalone npm packages (they currently ride with `@adastra/ahd`); split-out is a packaging task.
- Community contribution flow (DCO, review sign-off policy) still to write.

## Known blockers and how to unblock

1. **Live model evaluation numbers in the README** — drop API keys in
   `.env`, run `ahd eval-live swiss-editorial --brief b.yml --models
   claude-opus-4-7,gpt-5,gemini-3-pro --n 10 --report docs/evals/$(date
   +%Y-%m-%d)-swiss.md`, replace `docs/artwork/slop-distribution.svg`
   with measured data.
2. **Live vision critique** — same keys + a screenshot pipeline
   (Playwright is the obvious choice). Plug `anthropicVisionCritic`
   into a CLI command.
3. **Additional tokens** — design work, not code. Targets for v0.6:
   Y2K-Frutiger, Collision-Collage, Magazine-Grid, Swiss-Bleed.

## Later

- Figma plugin that reads `.ahd/brief.yml` and lints frames in the canvas
- Vision-critic pipeline on PR screenshots in CI with inline slop-tell comments
- `ahd serve` — preview server that hot-reloads brief and output side by side
- Public npm packages for `eslint-plugin-ahd` and `stylelint-plugin-ahd`
- `ahd-mcp` published to the MCP registry
