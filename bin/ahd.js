#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadDotEnv } from "../dist/env.js";
await loadDotEnv();
import { compile } from "../dist/compile.js";
import { loadToken, listTokens, validateAll } from "../dist/load.js";
import { lintFile, formatReport } from "../dist/lint/engine.js";
import { rules as lintRules } from "../dist/lint/rules/index.js";
import { runEval, formatEvalReport } from "../dist/eval/runner.js";
import { runLiveEval } from "../dist/eval/live.js";
import { runStdioServer } from "../dist/mcp/server.js";
import { VISION_RULES, anthropicVisionCritic, mockCritic } from "../dist/critique/critic.js";
import { runCritiqueOnDir, formatCritiqueReport } from "../dist/critique/runner.js";
import { runLiveImageEval, formatImageEvalReport } from "../dist/eval/image-live.js";
import { WORKERS_AI_IMAGE_DEFAULTS } from "../dist/eval/runners/workers-ai-image.js";
import { runTry, runTryImage } from "../dist/try.js";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TOKENS = resolve(ROOT, "tokens");

const [, , cmd, ...rest] = process.argv;

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
      const brief = parseYaml(await readFile(briefPath, "utf8"));
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
      const target = rest[0];
      if (!target) exit("usage: ahd lint <file.html|file.css> [...]");
      const files = rest.filter((a) => !a.startsWith("--"));
      const reports = [];
      for (const f of files) reports.push(await lintFile(f));
      const merged = {
        violations: reports.flatMap((r) => r.violations),
        rulesRun: reports[0]?.rulesRun ?? [],
        filesLinted: reports.length,
      };
      console.log(formatReport(merged));
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
      const outFile = flag(rest, "--out");
      if (!token)
        exit("usage: ahd eval <token> [--samples <dir>] [--out <file.md>]");
      const r = await runEval(token, resolve(dir, token));
      const text = formatEvalReport(r);
      if (outFile) {
        await writeFile(outFile, text);
        console.log(`wrote ${outFile}`);
      } else {
        console.log(text);
      }
      return;
    }

    case "eval-live": {
      const token = rest[0];
      const briefPath = flag(rest, "--brief");
      const modelsCsv = flag(rest, "--models");
      const n = parseInt(flag(rest, "--n") ?? "1", 10);
      const outDir = flag(rest, "--out") ?? "evals";
      const reportFile = flag(rest, "--report");
      if (!token || !briefPath || !modelsCsv)
        exit(
          "usage: ahd eval-live <token> --brief <brief.yml> --models <spec,spec,...> [--n <count>] [--out <dir>] [--report <file.md>]",
        );
      const models = modelsCsv.split(",").map((s) => s.trim()).filter(Boolean);
      const report = await runLiveEval({
        tokensDir: TOKENS,
        token,
        briefPath,
        models,
        n,
        outDir,
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
      const criticChoice = flag(rest, "--critic") ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock");
      if (!token || !briefPath)
        exit(
          "usage: ahd eval-image <token> --brief <brief.yml> [--models <cfimg:@cf/...,...>] [--n <count>] [--critic anthropic|mock] [--out <dir>] [--report <file.md>]",
        );
      if (criticChoice !== "anthropic" && criticChoice !== "mock") {
        exit("--critic must be 'anthropic' or 'mock'");
      }
      if (criticChoice === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
        exit("--critic anthropic requires ANTHROPIC_API_KEY; pass --critic mock for offline scoring");
      }
      const criticImpl = criticChoice === "mock"
        ? mockCritic({})
        : anthropicVisionCritic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: process.env.AHD_VISION_MODEL ?? "claude-haiku-4-5-20251001",
          });
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
      const critic = flag(rest, "--critic") ?? "anthropic";
      const max = parseInt(flag(rest, "--max") ?? "0", 10);
      if (!token)
        exit(
          "usage: ahd critique <token> [--samples <dir>] [--out <dir>] [--critic anthropic|mock] [--max <n>] [--report <file.md>]",
        );
      let criticImpl;
      if (critic === "mock") {
        criticImpl = mockCritic({});
      } else {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) exit("ANTHROPIC_API_KEY is not set (needed for --critic anthropic)");
        criticImpl = anthropicVisionCritic({ apiKey: key });
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

    default:
      console.log(`ahd — Artificial Human Design

commands:
  ahd list                              list every style token
  ahd show <id>                         print a style token as JSON
  ahd validate-tokens                   validate every token against the schema
  ahd compile <brief.yml> [--out d]     compile a brief into per-model prompts + spec.json
  ahd lint <file.html|css> [...]        run the slop linter (28 source-level rules)
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
  ahd critique <token> [--samples d] [--critic anthropic|mock] [--max n] [--out dir] [--report r.md]
                                        render each sample, run the vision critic on the screenshot

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

function exit(msg) {
  console.error(msg);
  process.exit(2);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
