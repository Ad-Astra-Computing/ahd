#!/usr/bin/env node
// Measures the false-positive rate of ahd/tracking-per-size against the
// committed eval corpora. Run with `node tools/measure-tracking-per-size.mjs`
// from a built tree (npm run build first). Reports, per corpus and arm,
// pages at display size, pages where the rule fires, and false fires
// against a selector-aware ground truth independent of the rule module.

import { readFile, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const CORPORA = ["swiss-editorial", "post-digital-green"];
const ARMS = ["raw", "compiled"];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractInlineStyle(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
}

function cssBlocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

function splitSelectors(selector) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of selector) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((s) => s.trim().replace(/\s+/g, " ")).filter((s) => s.length > 0);
}

function collectRootVars(blocks) {
  const vars = new Map();
  for (const { selector, body } of blocks) {
    if (!/(^|[\s,])(:root|html)(?=$|[\s,:{])/.test(selector)) continue;
    const propRe = /--([\w-]+)\s*:\s*([^;]+);/g;
    let pm;
    while ((pm = propRe.exec(body)) !== null) {
      vars.set(pm[1], pm[2].trim());
    }
  }
  return vars;
}

function resolveVars(body, vars) {
  return body.replace(/var\(\s*--([\w-]+)\s*(?:,\s*[^)]*)?\)/g, (_, name) => {
    return vars.has(name) ? vars.get(name) : `var(--${name})`;
  });
}

// Selector-aware ground truth: does the page have display type at 48px
// or larger, and does negative letter-spacing apply to at least one of
// the selectors that set that size, anywhere in the stylesheet.
function analyze(html) {
  const combined = stripComments(extractInlineStyle(html));
  const blocks = cssBlocks(combined);
  const rootVars = collectRootVars(blocks);

  const largeFontSelectors = new Set();
  const negTrackingSelectors = new Set();

  for (const { selector, body: rawBody } of blocks) {
    const body = resolveVars(rawBody, rootVars);
    const selectors = splitSelectors(selector);
    const sizeMatch = body.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
    const lsMatch = body.match(/letter-spacing\s*:\s*(-?[\d.]+)(em|rem|px)?/i);

    if (sizeMatch) {
      const n = parseFloat(sizeMatch[1]);
      const px = sizeMatch[2] === "px" ? n : n * 16;
      if (px >= 48) for (const s of selectors) largeFontSelectors.add(s);
    }
    if (lsMatch) {
      const v = parseFloat(lsMatch[1]);
      if (v < 0) for (const s of selectors) negTrackingSelectors.add(s);
    }
  }

  const hasLargeFont = largeFontSelectors.size > 0;
  const negTrackingApplies = [...largeFontSelectors].some((s) => negTrackingSelectors.has(s));
  return { hasLargeFont, negTrackingApplies };
}

async function listHtmlFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtmlFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

async function loadRule() {
  const modPath = resolve(root, "dist/lint/rules/tracking-per-size.js");
  const mod = await import(pathToFileURL(modPath).href);
  return mod.rule;
}

async function main() {
  const rule = await loadRule();

  console.log(
    "corpus/arm".padEnd(28) +
      "display>=48px".padEnd(16) +
      "rule fires".padEnd(13) +
      "false positive",
  );

  const totals = {};
  for (const corpus of CORPORA) {
    for (const arm of ARMS) {
      const corpusDir = join(root, "evals", corpus);
      const modelDirs = (await readdir(corpusDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => join(corpusDir, e.name, arm));

      let files = [];
      for (const d of modelDirs) files.push(...(await listHtmlFiles(d)));

      let display = 0;
      let fires = 0;
      let falsePositive = 0;

      for (const file of files) {
        const html = await readFile(file, "utf8");
        const ground = analyze(html);
        if (ground.hasLargeFont) display++;

        const violations = rule.check({ file, html, css: "" });
        const fired = violations.some((v) => /Display-size/.test(v.message));
        if (fired) {
          fires++;
          if (ground.negTrackingApplies) falsePositive++;
        }
      }

      const key = `${corpus}/${arm}`;
      totals[key] = { display, fires, falsePositive, n: files.length };
      console.log(
        key.padEnd(28) +
          String(display).padEnd(16) +
          String(fires).padEnd(13) +
          `${falsePositive} of ${fires}`,
      );
    }
  }

  return totals;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
