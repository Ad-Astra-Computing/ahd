# Positioning

## What AHD is

AHD is a **guardrail and evaluation layer for AI-generated UI.** It is not a design generator.

Four pieces, one purpose:

1. **A named taxonomy of AI design slop.** Thirty-eight concrete tells (28 source-level, 9 vision-only) that mark LLM-generated pages as LLM-generated. The taxonomy is the product's spine; every rule and every token traces back to it.
2. **Style tokens as promptable design direction.** Eight curated bundles (Swiss-Editorial, Neubrutalist-Gumroad, Post-Digital-Green, Manual-SF, Memphis-Clash, Heisei-Retro, Monochrome-Editorial, Bauhaus-Revival). Each token declares grid, type, palette, forbidden list, required quirks, reference lineage and per-model prompt fragments.
3. **A brief compiler.** Turns a structured intent into constrained model instructions, with a `final` mode for single-shot HTML output and a `draft` mode for human-in-the-loop exploration.
4. **An empirical eval loop.** `ahd eval-live` runs the same brief through any set of Claude / GPT / Gemini / CF Workers AI / Ollama models under a controlled raw-vs-compiled comparison, lints the output against the taxonomy, reports attempted vs scored counts, per-model deltas and per-tell frequency. `ahd critique` adds the vision layer via a multimodal critic over rendered screenshots.

## What AHD is not

- **Not a prompt pack.** Prompt packs sell style recipes. AHD's value is the reproducible scoring that tells you whether any recipe — ours or yours — actually moves a given model off its median.
- **Not a canvas product.** Galileo, Subframe, v0, Lovable, Bolt, Magic Patterns all optimise "prompt → shipped UI." AHD sits *beside* those products as an enforcement layer.
- **Not a design system.** Design systems (Material, shadcn, etc.) prescribe components; AHD prescribes *negatives* — the thirty-eight patterns a page must not exhibit — and measures compliance.

## What makes this defensible

The moat is not the prompts. The moat is **the taxonomy plus reproducible scoring.**

- A prompt anyone can rewrite. A named, versioned taxonomy with deterministic lint rules and a vision critic is an artefact that compounds with use.
- A style token anyone can fork. A per-release eval harness that publishes attempted counts, extraction failures, exact model ids, confidence intervals and negative results is a cultural commitment competitors rarely match.
- A benchmark like UI Bench scores *a single page in isolation*. AHD scores *a model under a specific brief under a specific intervention*, with a paired raw-vs-compiled control.

## Prior art

Pieces of AHD exist in the wild. The combination does not. Named, honestly:

- **Prompt libraries for AI UI generation** — [uiprompt.io](https://uiprompt.io/), [Promter](https://promter.dev/), GenDesigns, WebGardens. Structured prompts and style recipes targeting v0, Lovable, Bolt, Claude, Cursor. Overlap: they encode style direction; they do not carry a taxonomy or an eval.
- **Design-token linting in code** — [`@lapidist/design-lint`](https://design-lint.lapidist.net/), [`stylelint-design-tokens-plugin`](https://www.npmjs.com/package/stylelint-design-tokens-plugin), design-system-specific plugins. Enforce token / component consistency. Overlap: AHD's linter is a design-rules linter in the same tradition. Divergence: AHD's rules target *anti-patterns in AI-generated UI*, not token adherence to an internal design system.
- **Figma / design-system audit tools** — [DesignLint AI](https://www.designlintai.tech/). Audits Figma files against token and component rules. Overlap: the audit pattern. Divergence: AHD audits code and rendered HTML, not design files, and scopes to AI-generated output.
- **AI UI benchmarks** — [UI Bench](https://ui-bench.dev/). Scores generated HTML on static analysis, axe, Lighthouse, responsiveness, semantics. Overlap: the benchmark pattern. Divergence: UI Bench rates a page's *engineering quality*; AHD rates a page's *slop fingerprint* against a named taxonomy and runs a paired raw-vs-compiled control.

The differentiator, plainly: **nobody else bundles a named AI-slop taxonomy, a token-driven brief compiler, a deterministic linter for the taxonomy and a raw-vs-compiled empirical eval loop** into one reproducible project. That is the thing that's worth building.

## What we promise, what we don't

We promise:

- An honest, versioned taxonomy.
- A deterministic, source-level linter for every taxonomy entry that can be decided from code.
- A vision-critic pipeline for the rest.
- An eval harness that publishes attempted / extracted / scored counts, canonical model ids and per-model deltas — including negative results.
- Style tokens that declare their forbidden lists, required quirks and references publicly.

We do not promise:

- That the compiled brief beats the raw brief for every model. It does not. Published results include Claude Opus 4.7 dropping slop tells to zero, Qwen 2.5 Coder being unmoved, and Llama 3.3 70B *regressing* under the long compiled prompt. The framework exposes these differences; it does not paper over them.
- Aesthetic judgement. The linter catches *tells*, not *taste*. A page can pass every rule and still be bad design. AHD narrows the output; a human still picks.

## The one-line version

*AHD measures and reduces specific repeated AI design failures.* Everything else in the repo serves that sentence.
