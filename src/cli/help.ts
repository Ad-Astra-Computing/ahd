// Per-command help strings and resolution logic.
//
// Kept in its own module so the help map is unit-testable without
// spawning `ahd` as a subprocess. `bin/ahd.js` imports from the
// compiled output and dispatches; routing lives there because it
// must run before the async main() that dynamically imports heavy
// modules (Playwright, runners, critics).

export const COMMAND_HELP: Readonly<Record<string, string>> = Object.freeze({
  list: `ahd list · print every style token id, one per line.
usage: ahd list`,

  show: `ahd show · print one style token as JSON.
usage: ahd show <token-id>`,

  "validate-tokens": `ahd validate-tokens · validate every token against the schema.
usage: ahd validate-tokens`,

  compile: `ahd compile · compile a brief into per-model prompts plus spec.json.
usage: ahd compile <brief.yml> [--out <dir>] [--mode draft|final]
  --out <dir>    directory to write prompt.*.md + spec.json (default: ./out)
  --mode <m>     draft (three divergent directions, default) or final (single-shot)`,

  lint: `ahd lint · run the slop linter over HTML, CSS or SVG input.
usage: ahd lint <file> [<file>...] [flags]
  --config <path>              use an explicit config file
  --root <dir>                  project root for cross-file rules
  --whole-site                  walk root and lint every .html/.css/.svg (cross-file rules too)
  --json                        emit JSON report (includes sourceOnlySpa badge)
  --allow-source-only-spa       acknowledge that an SPA shell is all that ships`,

  "lint-rules": `ahd lint-rules · list every source-level lint rule.
usage: ahd lint-rules`,

  "vision-rules": `ahd vision-rules · list every vision-only rule.
usage: ahd vision-rules`,

  eval: `ahd eval · aggregate lint scores across pre-rendered samples.
usage: ahd eval <token> [--samples <dir>] [--report <file.md>]
  --samples <dir>    directory with <token>/<model>/{raw,compiled}/*.html (default: evals)
  --report <file>    write markdown report to file (default: stdout)`,

  "eval-live": `ahd eval-live · run a brief through live text-to-HTML models, score via linter.
usage: ahd eval-live <token> --brief <b.yml> --models <spec,...> [flags]
  --brief <file>        required
  --models <spec,...>   comma-separated model specs (see model spec section in --help)
  --n <N>               samples per cell (default 3)
  --out <dir>           write raw samples under <dir>/<token>/<model>/{raw,compiled}
  --report <file>       write markdown report`,

  "eval-image": `ahd eval-image · run a brief through image generators, score via vision critic.
usage: ahd eval-image <token> --brief <b.yml> [flags]
  --brief <file>        required
  --models <cfimg:...>  comma-separated image-gen specs
  --n <N>               samples per cell (default 3)
  --critic <spec>       claude-code (default) · anthropic · mock
  --report <file>       write markdown report`,

  "mcp-serve": `ahd mcp-serve · run the AHD MCP server over stdio.
usage: ahd mcp-serve`,

  try: `ahd try · generate one HTML page from a brief (demo).
usage: ahd try <brief.yml> [--model <spec>]
  --model <spec>   defaults to mock-swiss (offline), or a CF OSS model if keys are set`,

  "try-image": `ahd try-image · generate one image from a brief via a CF image model.
usage: ahd try-image <brief.yml>
requires: CF_API_TOKEN, CF_ACCOUNT_ID`,

  critique: `ahd critique · render each sample, run the vision critic on the screenshot.
usage: ahd critique <token> [flags]
  --samples <dir>   samples directory (default: evals)
  --out <dir>       screenshots + report dir
  --critic <spec>   claude-code (default) · anthropic · mock
  --max <N>         cap samples scored
  --report <file>   write markdown report`,

  "critique-url": `ahd critique-url · render a live URL, run the vision critic against the screenshot.
usage: ahd critique-url <url> [flags]
  --token <id>          style token to critique against (default: swiss-editorial)
  --critic <spec>       claude-code (default) · anthropic · mock
  --out <file.json>     structured critique report
  --screenshot <file>   save the rendered PNG
  --allow-unsafe-url    permit local / private addresses (off by default)`,

  "audit-mobile": `ahd audit-mobile · render a URL at mobile viewport, run deterministic layout rules.
usage: ahd audit-mobile <url> [flags]
  --width <px>          default 375
  --height <px>         default 812
  --out <file.json>     structured report
  --screenshot <file>   save the rendered PNG
  --allow-unsafe-url    permit local / private addresses (off by default)`,

  help: `ahd help · show help for a specific command.
usage: ahd help <command>
run 'ahd --help' to list every command.`,
});

export function resolveCommandHelp(name: string | undefined):
  | { ok: true; text: string }
  | { ok: false; error: string } {
  if (!name) {
    return { ok: true, text: COMMAND_HELP.help };
  }
  const text = COMMAND_HELP[name];
  if (!text) {
    return {
      ok: false,
      error: `unknown command: ${name}\nrun 'ahd --help' to list every command.`,
    };
  }
  return { ok: true, text };
}

// Heuristic: argument list signals a per-command help request if it
// contains --help or -h anywhere. Keeps the dispatch simple and
// keeps test parity between `ahd <cmd> --help` and `ahd <cmd> -h`.
export function argsRequestHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}
