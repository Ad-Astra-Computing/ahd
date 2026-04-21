# Roadmap

## v0.1 — in repo

- `ahd compile` CLI: brief + style token → `spec.json` + per-model prompts (Claude, GPT, Gemini, generic)
- Style-token schema and validator, `zod`-backed
- Five seed tokens: `swiss-editorial`, `neubrutalist-gumroad`, `post-digital-green`, `manual-sf`, `memphis-clash`
- Slop taxonomy (38 tells) documented
- Linter rule spec documented
- Dogfooded README artwork rendered against `swiss-editorial`

## v0.2 — eval harness (the proof)

Everything in the README that says "forces models off the median" is an empirical claim. Until this ships, that claim is aspirational.

- `ahd eval <token> --models claude,gpt,gemini,llama` — runs a fixed brief through each model, compiled and uncompiled
- Score output against the 38-tell taxonomy (vision critic for visual tells, AST lint for code tells)
- Report per-tell frequency baseline vs compiled, per model
- Replace illustrative numbers in `docs/artwork/slop-distribution.svg` with measured ones
- Publish results in `docs/evals/` and in the README

## v0.3 — linter implementation

The rules specified in `LINTER_SPEC.md`, actually written.

- `eslint-plugin-ahd` — all JSX/TSX rules
- `stylelint-plugin-ahd` — all CSS/Tailwind rules
- `ahd critique <url>` — vision critic CLI for rules that cannot be decided from source alone
- `ahd lint` — aggregate runner
- CI fixture corpus of slop-y and non-slop-y examples for rule testing

## v0.4 — MCP server

- `ahd-mcp` exposes `brief`, `palette`, `type_system`, `reference`, `lint`, `critique` as MCP tools
- Works inside Claude Code, Cursor, Windsurf, Zed without workflow change

## v0.5 — token library expansion

- Community contribution flow (DCO, review sign-off policy)
- Targets: Heisei-Retro, Collision-Collage, Monochrome-Editorial, Bauhaus-Revival, Y2K-Frutiger, Swiss-Bleed, Post-Web3-Minimal, Magazine-Grid
- Token graduation from `draft` → `stable` after three independent sign-offs and one downstream public project usage

## Later

- Figma plugin that reads `.ahd/brief.yml` and lints frames in the canvas
- A vision-critic pipeline that runs on PR screenshots in CI and comments with slop-tell violations
- `ahd serve` — a preview server that hot-reloads both the brief and the output side by side
