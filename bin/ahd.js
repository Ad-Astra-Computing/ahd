#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { loadDotEnv } from "../dist/env.js";
await loadDotEnv();
import { compile } from "../dist/compile.js";
import { loadToken, listTokens, validateAll, loadBrief } from "../dist/load.js";
import { lintFile, lintSource, lintSources, formatReport } from "../dist/lint/engine.js";
import { rules as lintRules } from "../dist/lint/rules/index.js";
import { crossFileRules as lintCrossRules } from "../dist/lint/cross-rules/index.js";
import {
  loadConfig,
  findProjectConfig,
  tokenToLintConfig,
  mergeConfigs,
  detectActiveToken,
} from "../dist/lint/config.js";
import { runEval, formatEvalReport } from "../dist/eval/runner.js";
import { runLiveEval } from "../dist/eval/live.js";
import { runStdioServer } from "../dist/mcp/server.js";
import { VISION_RULES, anthropicVisionCritic, mockCritic } from "../dist/critique/critic.js";
import { resolveCritic } from "../dist/critique/critics/index.js";
import { renderBanner } from "../dist/cli/banner.js";
import { COMMAND_HELP, resolveCommandHelp, argsRequestHelp } from "../dist/cli/help.js";
import { runCritiqueOnDir, formatCritiqueReport } from "../dist/critique/runner.js";
import { renderUrlToPng, fileToBase64 } from "../dist/critique/screenshot.js";
import { auditMobile, formatMobileReport } from "../dist/mobile/audit.js";
import { runLiveImageEval, formatImageEvalReport } from "../dist/eval/image-live.js";
import { WORKERS_AI_IMAGE_DEFAULTS } from "../dist/eval/runners/workers-ai-image.js";
import { runTry, runTryImage } from "../dist/try.js";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TOKENS = resolve(ROOT, "tokens");

const [, , cmd, ...rest] = process.argv;

// `ahd help <cmd>` and `ahd <cmd> --help` / `-h` both route here.
// Map + resolution logic lives in src/cli/help.ts so it is
// unit-testable without spawning the CLI.
if (cmd === "help") {
  const r = resolveCommandHelp(rest[0]);
  if (r.ok) {
    console.log(r.text);
    process.exit(0);
  } else {
    console.error(r.error);
    process.exit(2);
  }
}
if (cmd && COMMAND_HELP[cmd] && argsRequestHelp(rest)) {
  console.log(COMMAND_HELP[cmd]);
  process.exit(0);
}

async function main() {
  switch (cmd) {
    case "list":
      for (const id of await listTokens(TOKENS)) console.log(id);
      return;

    case "validate-tokens": {
      const results = await validateAll(TOKENS);
      let failed = 0;
      for (const r of results) {
        if (r.ok) console.log(`ok   ${r.id}`);
        else {
          failed++;
          console.log(`FAIL ${r.id}\n     ${r.error}`);
        }
      }
      process.exit(failed ? 1 : 0);
      return;
    }

    case "compile": {
      const briefPath = rest[0];
      const outDir = flag(rest, "--out") ?? "out";
      const modeFlag = flag(rest, "--mode") ?? "draft";
      if (!briefPath) exit("usage: ahd compile <brief.yml> [--out <dir>] [--mode draft|final]");
      if (modeFlag !== "draft" && modeFlag !== "final") {
        exit("--mode must be 'draft' or 'final'");
      }
      const brief = await loadBrief(briefPath);
      if (!brief.token) {
        exit("Brief is missing a `token:` field. Add one or use `ahd try --token <id>`.");
      }
      const token = await loadToken(TOKENS, brief.token);
      const result = compile(brief, token, modeFlag);
      await mkdir(outDir, { recursive: true });
      await writeFile(
        `${outDir}/spec.json`,
        JSON.stringify(result.spec, null, 2),
      );
      for (const [model, text] of Object.entries(result.prompts)) {
        await writeFile(`${outDir}/prompt.${model}.md`, text);
      }
      console.log(
        `wrote ${outDir}/spec.json and prompt.{claude,gpt,gemini,generic}.md (mode: ${modeFlag})`,
      );
      return;
    }

    case "show": {
      const id = rest[0];
      if (!id) exit("usage: ahd show <token-id>");
      const t = await loadToken(TOKENS, id);
      console.log(JSON.stringify(t, null, 2));
      return;
    }

    case "lint": {
      const configFlag = flag(rest, "--config");
      const rootFlag = flag(rest, "--root");
      const tokenFlag = flag(rest, "--token");
      const jsonMode = rest.includes("--json");
      // Whole-site mode enables cross-file rules (broken-internal-links, etc)
      // that only make sense when the caller passes every file in the build.
      // Implicit when --root is set (the flag signals a site-scoped run),
      // explicit via --whole-site. Single-file `ahd lint page.html` runs
      // per-file rules only so normal invocations don't false-fire.
      const wholeSiteMode = rest.includes("--whole-site") || !!rootFlag;
      // --allow-source-only-spa acknowledges the operator has read the
      // SPA-shell note: source lint can't see what JS renders, so a
      // "clean" result on a shell document is a source-only pass, not
      // a full design audit. Without this flag, the run still succeeds
      // (the rule is info-level) but we annotate the summary so
      // downstream badge issuers can downgrade accordingly.
      const allowSourceOnlySpa = rest.includes("--allow-source-only-spa");
      const explicitFiles = rest
        .filter(
          (a, i) =>
            !a.startsWith("--") &&
            rest[i - 1] !== "--config" &&
            rest[i - 1] !== "--root" &&
            rest[i - 1] !== "--token",
        );
      // --whole-site walks the root (or cwd when --root is omitted)
      // and lints every .html / .css / .svg found. Combine-safely
      // with explicit args: explicit paths are always included, any
      // duplicates deduped against the walk. If neither is given,
      // bail with the usage message.
      let files = explicitFiles;
      if (rest.includes("--whole-site")) {
        const walkRoot = rootFlag ? resolve(rootFlag) : process.cwd();
        const walked = await walkSiteFiles(walkRoot);
        const seen = new Set(files.map((f) => resolve(f)));
        for (const w of walked) {
          if (!seen.has(w)) {
            files.push(w);
            seen.add(w);
          }
        }
        if (files.length === 0) {
          exit(`ahd lint --whole-site: no .html / .css / .svg files under ${walkRoot}`);
        }
      }
      if (files.length === 0) {
        exit("usage: ahd lint <file.html|file.css> [...] [--config <path>] [--token <id>] [--json] [--root <dist>] [--whole-site] [--allow-source-only-spa]\n  Pass at least one file, or use --whole-site with --root to lint a tree.\n  --token <id> applies that token's lint-overrides; auto-detected from <meta name=\"ahd-token\"> when omitted.");
      }
      const configPath = configFlag ?? (await findProjectConfig(process.cwd()));
      const projectConfig = configPath ? await loadConfig(configPath) : undefined;
      // Build LintInput[] from files; when --root is given, strip it from
      // each file path so cross-file rules (broken-links) see site-rooted
      // paths like /index.html instead of absolute filesystem paths.
      const absRoot = rootFlag ? resolve(rootFlag) : null;
      const inputs = await Promise.all(
        files.map(async (f) => {
          const raw = await readFile(f, "utf8");
          const isCss = /\.css$/i.test(f);
          const abs = resolve(f);
          let rooted = abs;
          if (absRoot && abs.startsWith(absRoot)) {
            rooted = abs.slice(absRoot.length) || "/";
            if (!rooted.startsWith("/")) rooted = "/" + rooted;
          }
          return { file: rooted, html: isCss ? "" : raw, css: isCss ? raw : "" };
        }),
      );
      // Token-aware lint: explicit --token wins; otherwise sniff every input
      // for a meta or comment marker. The first detected id is authoritative
      // for the run (mixed-token batches are rare and the user can split the
      // run when they happen).
      let activeTokenId = tokenFlag;
      if (!activeTokenId) {
        for (const input of inputs) {
          const id = detectActiveToken(input.html);
          if (id) {
            activeTokenId = id;
            break;
          }
        }
      }
      let tokenConfig;
      if (activeTokenId) {
        try {
          const token = await loadToken(TOKENS, activeTokenId);
          tokenConfig = tokenToLintConfig(token);
        } catch (err) {
          process.stderr.write(
            `ahd lint: --token "${activeTokenId}" not loadable (${err instanceof Error ? err.message : err}); proceeding without token-aware overrides.\n`,
          );
        }
      }
      const config = mergeConfigs(projectConfig, tokenConfig);
      // Empty cross-rule list for single-file mode so we don't false-fire
      // broken-links against callers who only passed one page.
      const crossRules = wholeSiteMode ? undefined : [];
      const merged = lintSources(inputs, undefined, crossRules, config);
      const spaShellHit = merged.violations.some(
        (v) => v.ruleId === "ahd/spa-shell-detected",
      );
      const sourceOnlySpa = spaShellHit;
      const badge = sourceOnlySpa ? "source-only (SPA)" : "full";
      if (jsonMode) {
        const bySev = { error: 0, warn: 0, info: 0 };
        for (const v of merged.violations) bySev[v.severity]++;
        process.stdout.write(
          JSON.stringify(
            {
              violations: merged.violations,
              rulesRun: merged.rulesRun,
              filesLinted: merged.filesLinted,
              overrides: merged.overrides,
              error: bySev.error,
              warn: bySev.warn,
              info: bySev.info,
              files: merged.filesLinted,
              badge,
              sourceOnlySpa,
              allowSourceOnlySpa,
            },
            null,
            2,
          ) + "\n",
        );
      } else {
        console.log(formatReport(merged));
        if (config && merged.overrides.length > 0) {
          console.log(
            `\nActive overrides from ${configPath}${config.project ? ` (project: ${config.project})` : ""}:`,
          );
          for (const o of merged.overrides) {
            console.log(`  ${o.severity.padEnd(5)} ${o.ruleId}\n    reason: ${o.reason}`);
          }
        }
        if (sourceOnlySpa) {
          if (allowSourceOnlySpa) {
            console.log(
              `\nbadge: source-only (SPA) · operator acknowledged via --allow-source-only-spa`,
            );
          } else {
            console.log(
              `\nbadge: source-only (SPA) · this result does not cover JS-rendered design. Run \`ahd critique <url>\` for a full audit, or pass --allow-source-only-spa to acknowledge.`,
            );
          }
        }
      }
      const hasErrors = merged.violations.some((v) => v.severity === "error");
      process.exit(hasErrors ? 1 : 0);
      return;
    }

    case "lint-rules": {
      for (const r of lintRules) {
        console.log(`${r.severity.padEnd(5)} ${r.id}\n    ${r.description}`);
      }
      return;
    }

    case "vision-rules": {
      for (const r of VISION_RULES) {
        console.log(`warn  ${r.id}\n    ${r.description}`);
      }
      return;
    }

    case "eval": {
      const token = rest[0];
      const dir = flag(rest, "--samples") ?? "evals";
      const outFile = flag(rest, "--report") ?? flag(rest, "--out");
      // Token-aware lint is opt-in on `ahd eval`. The --raw-rules flag
      // disables it for pre-vs-post comparison passes (re-lint addenda).
      const tokenAware = !rest.includes("--raw-rules");
      if (!token)
        exit("usage: ahd eval <token> [--samples <dir>] [--report <file.md>] [--raw-rules]\n  By default the active token's lint-overrides apply. --raw-rules scores against the unmodified ruleset (used for pre-vs-post comparisons).");
      let tokenConfig;
      if (tokenAware) {
        try {
          const tk = await loadToken(TOKENS, token);
          tokenConfig = tokenToLintConfig(tk);
        } catch (err) {
          process.stderr.write(
            `ahd eval: token "${token}" not loadable (${err instanceof Error ? err.message : err}); scoring without token-aware overrides.\n`,
          );
        }
      }
      const r = await runEval(token, resolve(dir, token), {
        config: tokenConfig,
      });
      const text = formatEvalReport(r);
      if (outFile) {
        await writeFile(outFile, text);
        console.log(`wrote ${outFile}`);
      } else {
        console.log(text);
      }
      return;
    }

    case "validate-submission": {
      const dir = rest[0];
      if (!dir) {
        exit(
          "usage: ahd validate-submission <dir>\n  Validates <dir>/manifest.json against the current schema (must pass) and the target schema (warn-only). Use this before opening a contribution PR.",
        );
      }
      const manifestPath = resolve(dir, "manifest.json");
      const { existsSync } = await import("node:fs");
      if (!existsSync(manifestPath)) {
        exit(`ahd validate-submission: ${manifestPath} not found.`);
      }
      const raw = await readFile(manifestPath, "utf8");
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        exit(`ahd validate-submission: ${manifestPath} is not valid JSON: ${err instanceof Error ? err.message : err}`);
      }
      const { ManifestCurrentSchema, ManifestTargetSchema } = await import(
        "../dist/eval/types.js"
      );
      const cur = ManifestCurrentSchema.safeParse(parsed);
      const tgt = ManifestTargetSchema.safeParse(parsed);
      const lines = [];
      if (cur.success) {
        lines.push(`current schema: PASS (${parsed.models?.length ?? 0} cell(s))`);
      } else {
        lines.push("current schema: FAIL");
        for (const issue of cur.error.issues) {
          lines.push(`  - ${issue.path.join(".") || "<root>"}: ${issue.message}`);
        }
      }
      if (tgt.success) {
        lines.push("target schema:  PASS");
      } else {
        const missing = tgt.error.issues
          .filter((i) => i.code === "invalid_type" && i.received === "undefined")
          .map((i) => i.path.join("."));
        const other = tgt.error.issues.filter(
          (i) => !(i.code === "invalid_type" && i.received === "undefined"),
        );
        lines.push(
          `target schema:  ${other.length === 0 ? "MISSING aspirational fields" : "FAIL"}`,
        );
        if (missing.length) {
          const unique = [...new Set(missing.map((m) => m.replace(/^models\.\d+\./, "models[].")))];
          lines.push(`  missing: ${unique.join(", ")}`);
        }
        for (const issue of other) {
          lines.push(`  - ${issue.path.join(".") || "<root>"}: ${issue.message}`);
        }
      }
      console.log(lines.join("\n"));
      // Exit non-zero only when the current schema fails. Missing
      // target fields are warnings; the contract accepts current-shape
      // submissions today.
      if (!cur.success) process.exit(1);
      return;
    }

    case "eval-live": {
      const token = rest[0];
      const briefPath = flag(rest, "--brief");
      const modelsCsv = flag(rest, "--models");
      const n = parseInt(flag(rest, "--n") ?? "1", 10);
      const sampleConcurrency = parseInt(
        flag(rest, "--sample-concurrency") ?? "1",
        10,
      );
      const outDir = flag(rest, "--out") ?? "evals";
      const reportFile = flag(rest, "--report");
      if (!token || !briefPath || !modelsCsv)
        exit(
          "usage: ahd eval-live <token> --brief <brief.yml> --models <spec,spec,...> [--n <count>] [--sample-concurrency <count>] [--out <dir>] [--report <file.md>]\n  --sample-concurrency caps in-flight requests per (cell, condition). Default 1 (serial). 3+ is safe for CF-only runs; keep at 1 for subscription CLIs to avoid auth races.",
        );
      const models = modelsCsv.split(",").map((s) => s.trim()).filter(Boolean);
      const report = await runLiveEval({
        tokensDir: TOKENS,
        token,
        briefPath,
        models,
        n,
        outDir,
        sampleConcurrency,
      });
      const text = formatEvalReport(report);
      if (reportFile) {
        await writeFile(reportFile, text);
        console.log(`wrote ${reportFile}`);
      } else {
        console.log(text);
      }
      return;
    }

    case "mcp-serve": {
      await runStdioServer({ tokensDir: TOKENS });
      return;
    }

    case "try": {
      const briefPath = rest[0];
      if (!briefPath)
        exit(
          "usage: ahd try <brief.yml> [--token <id>] [--model <spec>] [--out <dir>] [--no-lint]",
        );
      await runTry({
        tokensDir: TOKENS,
        briefPath,
        tokenOverride: flag(rest, "--token"),
        modelSpec: flag(rest, "--model"),
        outDir: flag(rest, "--out"),
        skipLint: rest.includes("--no-lint"),
      });
      return;
    }

    case "try-image": {
      const briefPath = rest[0];
      if (!briefPath)
        exit(
          "usage: ahd try-image <brief.yml> [--token <id>] [--model <spec>] [--out <dir>]",
        );
      await runTryImage({
        tokensDir: TOKENS,
        briefPath,
        tokenOverride: flag(rest, "--token"),
        modelSpec: flag(rest, "--model"),
        outDir: flag(rest, "--out"),
      });
      return;
    }

    case "eval-image": {
      const token = rest[0];
      const briefPath = flag(rest, "--brief");
      const modelsCsv = flag(rest, "--models");
      const n = parseInt(flag(rest, "--n") ?? "3", 10);
      const outDir = flag(rest, "--out") ?? "evals";
      const reportFile = flag(rest, "--report");
      const criticChoice = flag(rest, "--critic") ?? "claude-code";
      if (!token || !briefPath)
        exit(
          "usage: ahd eval-image <token> --brief <brief.yml> [--models <cfimg:@cf/...,...>] [--n <count>] [--critic claude-code|anthropic|mock] [--out <dir>] [--report <file.md>]",
        );
      let criticImpl;
      try {
        criticImpl = resolveCritic(criticChoice, {
          anthropicModel: process.env.AHD_VISION_MODEL ?? "claude-haiku-4-5-20251001",
        });
      } catch (err) {
        exit(err instanceof Error ? err.message : String(err));
      }
      const models = modelsCsv
        ? modelsCsv.split(",").map((s) => s.trim()).filter(Boolean)
        : WORKERS_AI_IMAGE_DEFAULTS.slice(0, 2).map((m) => `cfimg:${m}`);
      const report = await runLiveImageEval({
        tokensDir: TOKENS,
        token,
        briefPath,
        imageModels: models,
        critic: criticImpl,
        n,
        outDir,
      });
      const text = formatImageEvalReport(report);
      if (reportFile) {
        await writeFile(reportFile, text);
        console.log(`wrote ${reportFile}`);
      } else {
        console.log(text);
      }
      return;
    }

    case "critique": {
      const token = rest[0];
      const samplesDir = flag(rest, "--samples") ?? "evals";
      const outDir = flag(rest, "--out") ?? "critiques";
      const reportFile = flag(rest, "--report");
      const critic = flag(rest, "--critic") ?? "claude-code";
      const max = parseInt(flag(rest, "--max") ?? "0", 10);
      if (!token)
        exit(
          "usage: ahd critique <token> [--samples <dir>] [--out <dir>] [--critic claude-code|anthropic|mock] [--max <n>] [--report <file.md>]",
        );
      let criticImpl;
      try {
        criticImpl = resolveCritic(critic, {});
      } catch (err) {
        exit(err instanceof Error ? err.message : String(err));
      }
      await mkdir(outDir, { recursive: true });
      const report = await runCritiqueOnDir({
        samplesDir: resolve(samplesDir, token),
        token,
        critic: criticImpl,
        outDir,
        max: max > 0 ? max : undefined,
      });
      const text = formatCritiqueReport(report);
      if (reportFile) {
        await writeFile(reportFile, text);
        console.log(`wrote ${reportFile}`);
      } else {
        console.log(text);
      }
      return;
    }

    case "critique-url": {
      const url = rest[0];
      const token = flag(rest, "--token") ?? "swiss-editorial";
      const critic = flag(rest, "--critic") ?? "claude-code";
      const outPath = flag(rest, "--out") ?? "critique-url.json";
      const shotPath = flag(rest, "--screenshot") ?? "critique-url.png";
      const allowUnsafeUrl = rest.includes("--allow-unsafe-url");
      if (!url || !/^https?:\/\//.test(url))
        exit(
          "usage: ahd critique-url <url> [--token <id>] [--critic claude-code|anthropic|mock] [--out <file.json>] [--screenshot <file.png>] [--allow-unsafe-url]",
        );
      let criticImpl;
      try {
        criticImpl = resolveCritic(critic, {});
      } catch (err) {
        exit(err instanceof Error ? err.message : String(err));
      }
      console.log(`rendering ${url} → ${shotPath}`);
      try {
        await renderUrlToPng(url, shotPath, { allowUnsafeUrl });
      } catch (err) {
        if (err && err.name === "UrlBlockedError") {
          exit(
            `refused to render ${url}: ${err.reason}. If you are certain you want to render a local / private URL, re-run with --allow-unsafe-url.`,
          );
        }
        throw err;
      }
      const imageBase64 = await fileToBase64(shotPath);
      console.log(`running ${critic} vision critic against token=${token}`);
      const violations = await criticImpl.critique({
        imageBase64,
        token,
        url,
      });
      const result = {
        url,
        token,
        critic: criticImpl.id,
        runAt: new Date().toISOString(),
        screenshot: shotPath,
        violations,
        visionRuleset: VISION_RULES.map((r) => r.id),
      };
      await writeFile(outPath, JSON.stringify(result, null, 2) + "\n");
      if (violations.length === 0) {
        console.log(`✓ no vision tells · wrote ${outPath}`);
      } else {
        console.log(`${violations.length} vision tell(s):`);
        for (const v of violations) console.log(`  · ${v.ruleId}: ${v.message}`);
        console.log(`wrote ${outPath}`);
      }
      return;
    }

    case "audit-mobile": {
      const url = rest[0];
      const outPath = flag(rest, "--out");
      const shotPath = flag(rest, "--screenshot");
      const widthFlag = flag(rest, "--width");
      const heightFlag = flag(rest, "--height");
      const allowUnsafeUrl = rest.includes("--allow-unsafe-url");
      if (!url || !/^https?:\/\//.test(url)) {
        exit(
          "usage: ahd audit-mobile <url> [--out <file.json>] [--screenshot <file.png>] [--width 375] [--height 812] [--allow-unsafe-url]",
        );
      }
      const viewport = {
        width: widthFlag ? parseInt(widthFlag, 10) : 375,
        height: heightFlag ? parseInt(heightFlag, 10) : 812,
      };
      console.log(`auditing ${url} at ${viewport.width}x${viewport.height}`);
      let report;
      try {
        report = await auditMobile({
          url,
          viewport,
          screenshotPath: shotPath,
          allowUnsafeUrl,
        });
      } catch (err) {
        if (err && err.name === "UrlBlockedError") {
          exit(
            `refused to audit ${url}: ${err.reason}. If you are certain you want to render a local / private URL, re-run with --allow-unsafe-url.`,
          );
        }
        throw err;
      }
      if (outPath) {
        await writeFile(outPath, JSON.stringify(report, null, 2) + "\n");
        console.log(`wrote ${outPath}`);
      }
      console.log(formatMobileReport(report));
      const hasErrors = report.violations.some((v) => v.severity === "error");
      process.exit(hasErrors ? 1 : 0);
      return;
    }

    default:
      console.log(`${renderBanner()}ahd · Artificial Human Design

commands:
  ahd help <cmd>                        per-command help (or: ahd <cmd> --help)
  ahd list                              list every style token
  ahd show <id>                         print a style token as JSON
  ahd validate-tokens                   validate every token against the schema
  ahd compile <brief.yml> [--out d]     compile a brief into per-model prompts + spec.json
  ahd lint <file.html|css|svg> [...]    run the slop linter (38 source-level rules: 35 HTML/CSS + 3 SVG)
                                        flags: --config, --json, --root, --whole-site, --allow-source-only-spa
  ahd lint-rules                        list every source-level lint rule
  ahd vision-rules                      list every vision-only rule (run via the critic)
  ahd eval <token> [--samples dir]      aggregate lint scores across pre-rendered samples
  ahd eval-live <token> --brief b.yml --models <spec,...> [--n 3] [--out dir] [--report r.md]
                                        run a brief through live text-to-HTML models, score via linter
  ahd eval-image <token> --brief b.yml [--models <cfimg:@cf/...,...>] [--n 3] [--report r.md]
                                        run a brief through live image-generation models, score via vision critic
  ahd mcp-serve                         run the AHD MCP server over stdio
  ahd try <brief.yml> [--model <spec>]  demo: generate one HTML page (default mock-swiss offline, or CF OSS if keys are set)
  ahd try-image <brief.yml>             demo: generate one image via cfimg:<model> (needs CF_API_TOKEN + CF_ACCOUNT_ID)
  ahd critique <token> [--samples d] [--critic claude-code|anthropic|mock] [--max n] [--out dir] [--report r.md]
                                        render each sample, run the vision critic on the screenshot
  ahd critique-url <url> [--token <id>] [--critic claude-code|anthropic|mock] [--out <file.json>] [--screenshot <file.png>]
                                        render a live URL, run the vision critic against the screenshot
  ahd audit-mobile <url> [--width 375] [--height 812] [--out f.json] [--screenshot f.png]
                                        render a URL at mobile viewport and run deterministic layout rules

live-eval model specs:
  mock-slop, mock-swiss                 deterministic, offline
  claude-<id>                           requires ANTHROPIC_API_KEY
  gpt-<id> / o<n>                       requires OPENAI_API_KEY
  gemini-<id>                           requires GEMINI_API_KEY or GOOGLE_API_KEY
  cf:<@cf/vendor/model>                 Cloudflare Workers AI (OSS models, free tier)
                                        requires CF_API_TOKEN + CF_ACCOUNT_ID
  ollama:<model>                        requires a running ollama at :11434

image-generation specs (for ahd eval-image):
  cfimg:<@cf/vendor/model>              Cloudflare Workers AI image models (FLUX schnell, SDXL, etc.)
                                        requires CF_API_TOKEN + CF_ACCOUNT_ID

CF AI Gateway (caching, rate limiting, spend tracking for any frontier provider):
  CF_AI_GATEWAY=<account>/<gateway>     when set, claude-*, gpt-*, gemini-*
                                        specs route through the gateway
                                        transparently (no spec change needed)

docs: docs/SLOP_TAXONOMY.md, docs/LINTER_SPEC.md, docs/STYLE_TOKEN_SCHEMA.md, docs/TESTING.md, docs/ROADMAP.md`);
  }
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

// Walk a directory tree collecting lintable files. Skips dotfiles
// and common build-artefact dirs so a whole-site run doesn't dig
// into node_modules or .git. Returns absolute paths.
async function walkSiteFiles(rootDir) {
  const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".astro", "coverage", ".cache"]);
  const LINTABLE = /\.(html|css|svg)$/i;
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== "." && e.name !== "..") continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && LINTABLE.test(e.name)) {
        out.push(p);
      }
    }
  }
  await walk(rootDir);
  return out.sort();
}

function exit(msg) {
  console.error(msg);
  process.exit(2);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
