#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { compile } from "../src/compile.js";
import { loadToken, listTokens, validateAll } from "../src/load.js";

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
      if (!briefPath) exit("usage: ahd compile <brief.yml> [--out <dir>]");
      const brief = parseYaml(await readFile(briefPath, "utf8"));
      const token = await loadToken(TOKENS, brief.token);
      const result = compile(brief, token);
      await mkdir(outDir, { recursive: true });
      await writeFile(
        `${outDir}/spec.json`,
        JSON.stringify(result.spec, null, 2),
      );
      for (const [model, text] of Object.entries(result.prompts)) {
        await writeFile(`${outDir}/prompt.${model}.md`, text);
      }
      console.log(`wrote ${outDir}/spec.json and prompt.{claude,gpt,gemini,generic}.md`);
      return;
    }

    case "show": {
      const id = rest[0];
      if (!id) exit("usage: ahd show <token-id>");
      const t = await loadToken(TOKENS, id);
      console.log(JSON.stringify(t, null, 2));
      return;
    }

    default:
      console.log(`ahd — Artificial Human Design

commands:
  ahd list                          list all style tokens
  ahd show <id>                     print a style token as JSON
  ahd validate-tokens               validate every token against the schema
  ahd compile <brief.yml> [--out d] compile a brief into per-model prompts + spec.json

docs: docs/SLOP_TAXONOMY.md, docs/LINTER_SPEC.md, docs/STYLE_TOKEN_SCHEMA.md`);
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
