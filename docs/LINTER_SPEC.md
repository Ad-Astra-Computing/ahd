# AHD Linter Rule Spec

Thirty-nine slop tells in the catalogued taxonomy. Three engines enforce them: thirty-eight source-level rules in `ahd lint` (HTML/CSS/JSX detection across web, brand, typography, accessibility, plus a small SVG-source set and one cross-file rule), fourteen vision rules in `ahd critique` (screenshot detection), and six mobile-layout rules in `ahd audit-mobile` (rendered-page checks against a 375px viewport). Each rule has an id, a surface, a detection method, a severity and a suggested remediation. Source rules also ship as `eslint-plugin-ahd` (JSX/TSX) and `stylelint-plugin-ahd` (CSS/Tailwind/vanilla); vision rules run only via the critic; mobile rules run only via the audit-mobile pipeline. Some taxonomy entries are vision-only and have no source-level counterpart; some entries live in the brief compiler's negative-prompt layer and are caught at generation time rather than after.

## Rule format

```yaml
id: ahd/no-purple-blue-gradient
surface: css | jsx | tsx | html | tailwind | vision
severity: error | warn | info
detect: <detection strategy>
fix: <auto-fix strategy or "manual">
rationale: <one-line reason, links to SLOP_TAXONOMY tell>
```

## Rules

### Web and UI

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/no-default-grotesque` | css, tailwind | error | Font family resolves to Inter, Roboto, Open Sans, Poppins, Lato, Nunito, Manrope, Plus Jakarta Sans, system-ui as display or body. |
| `ahd/no-purple-blue-gradient` | css, tailwind | error | `linear-gradient` or `bg-gradient-to-*` containing any two of {indigo, purple, violet, fuchsia, pink, blue} as stops. |
| `ahd/no-centered-hero` | jsx, tsx | warn | First section contains `text-center` or `items-center justify-center` wrapping an `<h1>` plus two buttons. |
| `ahd/no-uniform-radius` | css, tailwind | warn | More than 70% of interactive elements share the same `border-radius` token and that token is `rounded-2xl`, `rounded-xl` or 12–16px. |
| `ahd/no-three-equal-cards` | jsx, tsx | warn | A grid or flex row with exactly three children of identical component type and near-identical subtree shape. |
| `ahd/no-lucide-in-rounded-square` | jsx, tsx | warn | `<Zap>`, `<Shield>`, `<Sparkles>` (or any Lucide import) wrapped in a `rounded-*` container with a gradient or tinted bg. |
| `ahd/no-emoji-bullets` | jsx, tsx, html | error | List items start with an emoji character from the {✨ 🚀 ⚡ 🎯 🔒 💡 🎨 🧠} set. |
| `ahd/no-indiscriminate-glass` | css, tailwind | warn | `backdrop-blur` used on more than one distinct component in the tree. |
| `ahd/no-flat-dark-mode` | css | warn | `--background-dark` or equivalent is `#0a0a0a`, `#000`, `#111`, `#0f172a` with a single accent of high chroma > 0.2 in OKLCH. |
| `ahd/single-shadow-style` | css, tailwind | info | More than 80% of shadowed elements share the same shadow token. |
| `ahd/no-gradient-text` | css, tailwind | error | `bg-clip-text text-transparent bg-gradient-*` applied to text containing "AI" or "future" (case-insensitive). |
| `ahd/no-fake-testimonials` | vision, jsx | warn | Testimonial cards using DiceBear, UI Faces, or stock avatar domains in src. |
| `ahd/no-fake-trust-bar` | jsx, html | info | A "Trusted by" or "Backed by" section with three or more logos. The rule informs; verifying logos against real customer relationships is the reader's job. |
| `ahd/no-em-dashes-in-prose` | html, jsx | warn | Em-dashes in body prose. The single highest-confidence AI-writing tell. |
| `ahd/no-inline-style-animation` | html, jsx | error | `style="animation:..."` or `style="transition:..."` declared inline rather than via CSS rule, breaking the reduced-motion gate. |
| `ahd/spa-shell-detected` | html | info | Document is a SPA shell (empty body, JS bundle entry). Source-level lint cannot see what the bundle renders; this surfaces the limitation rather than scoring a clean pass against an empty document. |
| `ahd/bento-has-anchor` | jsx, vision | warn | Bento grid present with no cell given explicit visual dominance (larger size, unique treatment). |
| `ahd/require-asymmetry` | vision | warn | Page composition scores > 0.85 on a horizontal symmetry metric across hero and primary sections. |
| `ahd/radius-hierarchy` | css | warn | Border-radius tokens used: fewer than two distinct values across buttons, cards and media. |
| `ahd/no-shimmer-decoration` | css, jsx | warn | Diagonal shimmer animation used on non-loading elements. |
| `ahd/motion-has-intent` | jsx, css | warn | Entrance animations applied to more than 50% of above-fold elements with no stagger reason declared in a `data-motion` attribute. |
| `ahd/cta-not-canonical` | vision, jsx | info | Primary CTA matches the canonical shape: 44px tall, 12px radius, gradient fill, trailing arrow. |
| `ahd/pricing-not-three` | jsx | info | Pricing section has exactly three tiers with the middle marked "Most Popular". |
| `ahd/footer-not-four-col` | jsx | info | Footer uses the canonical four-column Product/Company/Resources/Legal pattern. |
| `ahd/no-default-spline` | jsx, html | warn | Spline scene URL matches known default/iridescent blob scenes. |
| `ahd/respect-reduced-motion` | css, jsx | error | Animations declared with no `@media (prefers-reduced-motion: reduce)` counterpart. |
| `ahd/no-slop-copy` | content, jsx | warn | Copy contains banned phrases: "build the future of", "ship faster", "AI-native", "cutting-edge", "seamless", "best-in-class", "unleash", "empower", "revolutionize". |
| `ahd/layout-deadspace` | vision | warn | A two-column section where one column is significantly taller than the other produces visible dead space in the shorter neighbour. Common when a left text column sits beside a right card column that grows over time. |

### Graphic and Brand

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/no-corporate-memphis` | vision | warn | Illustration classifier match on Corporate Memphis embedding cluster. |
| `ahd/no-ai-illustration` | vision | warn | Classifier confidence > 0.7 on AI-rendered illustration with subsurface-scatter signature. |
| `ahd/no-iridescent-blob` | vision, jsx | warn | 3D hero asset with iridescent shader signature or Spline default blob. |
| `ahd/no-laptop-office-stock` | vision | warn | Hero image matches stock-photo cluster (diverse team at laptop in sunlit office). |
| `ahd/mesh-has-counterforce` | vision, css | warn | Mesh gradient present with no typographic anchor (display size ≥ 72px with negative tracking) within 100vh. |
| `ahd/wordmark-not-dot-grotesque` | vision, svg | warn | Wordmark is lowercase grotesque plus trailing dot or bracket. |
| `ahd/icons-not-monoline-default` | svg | warn | Icon set is entirely uniform 1.5px stroke with rounded caps. |
| `ahd/image/no-malformed-anatomy` | vision | warn | Image-generation tells: six-finger hands, twisted limbs, doubled teeth, merged fingers, extra joints. |
| `ahd/image/no-midjourney-face-symmetry` | vision | warn | Impossibly symmetrical, glossy, age-smoothed human faces are a generator fingerprint. |
| `ahd/image/no-decorative-cursive-in-render` | vision | warn | Fake cursive or unreadable script lettering overlaid on renders is a slop tell. |
| `ahd/image/no-stock-diversity-casting` | vision | warn | Generic "diverse team of five smiling professionals" casting pattern is a stock / Corporate-Memphis hand-me-down. |

### SVG (source)

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/svg/no-uniform-stroke` | svg | warn | Monoline illustration (every stroke the same width) is a Feather/Lucide default tell. |
| `ahd/svg/palette-bounds` | svg | info | Every colour used in the SVG should trace back to the token's declared palette. |
| `ahd/svg/no-perfect-symmetry` | svg | info | A perfectly mirrored composition is the stock-illustration / Alegria default. Tokens require at least one asymmetric element. |

### Typography and System

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/weight-variety` | css | warn | Fewer than three distinct font-weight values used across the page. |
| `ahd/line-height-per-size` | css | warn | Single line-height value applied across display, body and caption sizes. |
| `ahd/body-measure` | css | warn | Body paragraph width resolves outside 55–75ch at the primary breakpoint. |
| `ahd/tracking-per-size` | css | warn | No negative tracking on text ≥ 48px; no positive tracking on all-caps labels. |
| `ahd/require-type-pairing` | css | error | Fewer than two font families used across display and text. |
| `ahd/require-named-grid` | css, jsx | warn | No declared grid system (`ahd.grid`) in config; or layout uses only stacked flex columns with no shared column structure. Named grid is design opinion, not correctness, so this stays at warn. |

### Accessibility

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/a11y/heading-skip` | html, jsx | warn | Heading levels skip a step (h1 → h3). Screen-reader navigation breaks on skipped levels. |
| `ahd/a11y/img-without-alt` | html, jsx | error | `<img>` element with neither `alt` attribute nor `role="presentation"`. |
| `ahd/a11y/button-without-label` | html, jsx | error | `<button>` element with no text content, no `aria-label`, and no labelled child icon. |
| `ahd/a11y/link-without-text` | html, jsx | error | `<a>` element with no text content, no `aria-label`, and no labelled child icon. |

### Cross-file (whole-site mode only)

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/no-broken-internal-links` | html | error | An internal `href` references a path that does not resolve to any file in the site root. Fires only when `ahd lint --whole-site --root <dist>` is invoked; single-file lint cannot see other files in the build. |

### Mobile (rendered-page, `ahd audit-mobile`)

| id | surface | severity | detect |
|---|---|---|---|
| `ahd/mobile/viewport-meta-present` | html | error | `<meta name="viewport" content="width=device-width, ...">` is missing. Without it, mobile browsers render at desktop width and scale down, defeating every other mobile treatment. |
| `ahd/mobile/no-horizontal-overflow` | rendered | error | Document or any visible element extends past the right edge of a 375px viewport. Catches unwrapped nav, overflowing pre blocks, fixed-width tables, and display-size headlines that don't scale. |
| `ahd/mobile/tap-target-size` | rendered | warn | Interactive elements (buttons, nav links, form controls) below 32px tall at 375px viewport. Trips the fat-finger threshold. |
| `ahd/mobile/body-font-size` | rendered | warn | Substantive `<p>` text rendering below 14px CSS pixels at 375px. Forces zoom for one-handed reading. |
| `ahd/mobile/scrollable-no-affordance` | rendered | warn | Horizontally-scrollable region (`overflow-x: auto/scroll` with content > clientWidth) hides its scrollbar without a replacement cue (`scroll-snap-type`, edge-fade `mask-image`, or `data-scroll-affordance` opt-out). Touch users have no signal that more content exists. |
| `ahd/mobile/list-mark-alignment` | rendered | warn | A vertical list of rows starting with leading marks (bracketed glyph wrapper, icon, bullet) has misaligned post-mark content because the marks differ in rendered width and nothing reserves a fixed slot for them. Add `min-width` / `width` to the mark wrapper so all rows align. Detection: post-mark text x varies by more than 2px across same-tag, vertically-stacked siblings. |

## Severity policy

- `error` fails CI. Reserved for rules with high false-positive resistance.
- `warn` prints in CI, does not fail. Most composition rules start here and graduate.
- `info` is advisory. Used for anything that is slop in 90% of cases but legitimate in the other 10%.

## Vision pass

Rules with `surface: vision` run against a screenshot rather than source. The pass is a single LLM critic call with the SLOP_TAXONOMY as system context, scored against a checklist. Shipped separately as `ahd critique <url>`.

## Config overrides

`.ahd.json` (or `ahd.config.json`) declares per-rule severity overrides at the project level:

```json
{
  "project": "dispatch",
  "overrides": [
    {
      "ruleId": "ahd/no-three-equal-cards",
      "severity": "off",
      "reason": "three tiers intentional, middle tier is loss leader per brief P-4"
    }
  ]
}
```

No silent disables. Every override carries a `reason` of at least ten characters, and the lint report's `overrides` field surfaces every applied override so reviewers can see what the project chose not to enforce and why.

Tokens with a `lint-overrides` block (a token that intentionally rejects an editorial default) translate the same shape into project-equivalent overrides at lint time. See `docs/STYLE_TOKEN_SCHEMA.md`.

### Roadmap (not yet shipped)

- Per-path / per-glob overrides (`path: src/pricing/*.tsx`). Currently overrides are repo-scoped only.
- `ahd audit` subcommand to enumerate every active override across the repo. Currently the lint report's `overrides` field is the audit surface.
- `ahd.config.yml` (YAML form). Currently JSON only.
