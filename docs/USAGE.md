# Usage

There are three ways to use AHD in production. There is also a single-command demo that does not count as a production path. The production flows are independent; adopt one without touching the others.

## Quick demo: `ahd try`

The fastest way to see the framework produce something. One brief in, one HTML page out, linted automatically. Offline by default, no API keys required.

```bash
npx ahd try briefs/landing.yml
```

What happens in order. The brief is read from disk. Its `token:` field (or a `--token <id>` override) resolves to a style token in `tokens/`. The brief is compiled in `mode: final`, which produces a single-output system prompt without the exploration-mode "three divergent directions" instruction. A runner is chosen. If no `--model <spec>` flag is set, `ahd try` uses `mock-swiss` when no Cloudflare credentials are in the environment, or `cf:@cf/mistralai/mistral-small-3.1-24b-instruct` (the measured-best OSS model on the Swiss taxonomy, free tier) when they are. The runner is called once. No pairing, no retry loop outside the runner's own, no iteration. The response is extracted to HTML. A header comment is stamped into the file declaring the token, the model, the ISO timestamp and a `Demo artifact, not production output` line. The file is written to `./out/ahd-try-<token>-<timestamp>.html`. Unless `--no-lint` is set, the source linter runs on the output immediately and prints a summary.

```bash
npx ahd try briefs/landing.yml --model mock-swiss
npx ahd try briefs/landing.yml --model cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast
npx ahd try briefs/landing.yml --token monochrome-editorial
npx ahd try-image briefs/editorial-illustration.yml   # needs CF_API_TOKEN + CF_ACCOUNT_ID
```

`ahd try` exists to make the framework demonstrable in one command. It is not the production path. For production you use the three flows below.

## 1. As a linter in continuous integration

This is the cheapest integration. No model calls, no API keys. You treat AHD the way you treat ESLint or Stylelint. Run it on the HTML and CSS your AI tools emit and fail the build when the taxonomy catches a slop tell.

### Install

```bash
npm install --save-dev @adastra/ahd
```

### Run it locally

```bash
npx ahd lint dist/*.html src/**/*.css
npx ahd lint-rules
```

Exit code zero means clean. Exit code one means at least one rule at error severity fired.

### GitHub Actions

Drop this into `.github/workflows/ahd.yml` in any project that consumes AHD.

```yaml
name: ahd
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - run: npm ci
      - run: npx ahd lint dist/**/*.html src/**/*.css
```

A fuller example with token validation and a dry-run mock eval lives at `.github/workflows/ahd-lint.example.yml` in this repo. A Nix-based variant that uses the flake devShell is at `.github/workflows/ahd-nix.example.yml`.

### As a pre-commit hook

The reference hook is at `.github/examples/pre-commit.example.sh`. Copy it to `.git/hooks/pre-commit` and make it executable. It lints only the staged HTML and CSS files, so the hook stays fast.

For projects that use husky, add the same one-liner under `.husky/pre-commit`. For projects that use lefthook, a `lefthook.yml` template is at `.github/examples/lefthook.example.yml`.

## 2. Inside a design agent, via MCP

If your agent speaks MCP, which covers Claude Code, Cursor, Windsurf, Zed and Continue, you start the AHD MCP server once and the agent picks up the tools on its own.

### Start the server

```bash
npx ahd mcp-serve
```

### Wire it into the agent

In Claude Code, the `.mcp.json` entry looks like this.

```json
{
  "mcpServers": {
    "ahd": {
      "command": "npx",
      "args": ["ahd-mcp"]
    }
  }
}
```

### Tools the server exposes

The server speaks JSON-RPC over stdio and registers eight tools. `ahd.list_tokens` returns every style token in the library. `ahd.get_token` returns one token as JSON. `ahd.brief` takes a brief plus a token id and returns a compiled spec plus per-model prompts. `ahd.palette` returns just the OKLCH palette and role assignments for a token. `ahd.type_system` returns the type scale, families, pairing rules, tracking and measure. `ahd.reference` returns the movement, studio and designer anchors the token draws from. `ahd.lint` runs the thirty-four-rule source linter on an HTML and CSS pair. `ahd.vision_rules` lists the fourteen vision-only rules the agent can use when it has access to a rendered screenshot.

The canonical agent loop is three steps. Call `ahd.brief` to get a token-anchored system prompt. Generate. Call `ahd.lint` on the output and iterate until the linter is clean.

## 3. As an evaluation loop

This integration is the most involved and the highest signal. You run the same brief through several models in both raw and compiled conditions, let the source linter and the vision critic score the output, and publish the report. This is how the numbers in `README.md` were produced.

### Text to HTML

```bash
CF_API_TOKEN=… CF_ACCOUNT_ID=… \
  ahd eval-live swiss-editorial \
    --brief briefs/landing.yml \
    --models cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast,cf:@cf/mistralai/mistral-small-3.1-24b-instruct \
    --n 10 \
    --report docs/evals/$(date +%Y-%m-%d)-swiss.md
```

Add `claude-opus-4-7`, `gpt-5` or `gemini-3-pro` to the `--models` list if you have the keys. Every frontier call routes through Cloudflare AI Gateway transparently when `CF_AI_GATEWAY=<account>/<gateway>` is set, so you get caching and spend tracking for free.

### Image generation

```bash
CF_API_TOKEN=… CF_ACCOUNT_ID=… ANTHROPIC_API_KEY=… \
  ahd eval-image editorial-illustration \
    --brief briefs/editorial-illustration.yml \
    --models cfimg:@cf/black-forest-labs/flux-1-schnell,cfimg:@cf/bytedance/stable-diffusion-xl-lightning \
    --n 5 \
    --report docs/evals/$(date +%Y-%m-%d)-editorial-image.md
```

Raw and compiled PNGs land in `evals/<token>/images/<model>/<condition>/`. Each is critiqued by the vision critic against the fourteen vision-only rules. The report gives per-model deltas and per-tell frequency the same way the text eval does.

### Vision critique over already-rendered HTML

```bash
ANTHROPIC_API_KEY=… \
  ahd critique swiss-editorial \
    --samples evals \
    --critic anthropic \
    --max 20 \
    --report docs/evals/$(date +%Y-%m-%d)-vision.md
```

## Running the whole pipeline for free

Every live runner has a deterministic mock. You can exercise the full pipeline offline.

```bash
ahd eval-live swiss-editorial \
  --brief briefs/landing.yml \
  --models mock-slop,mock-swiss \
  --n 3

ahd critique swiss-editorial --samples evals --critic mock
```

The test suite uses the same mocks. Running them locally is the right way to confirm the wiring works before you spend anything on live API calls.
