import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Doc-vs-code parity CI (task #20 of the v0.10 governance plan).
//
// AHD ships a rule manifest (rules.manifest.json) generated from
// code, a documentation table (docs/LINTER_SPEC.md), a README rule
// count, and a CLI help map (src/cli/help.ts) that all describe the
// same surface from different angles. Each is a "contract surface"
// in the audit's sense: a place a consumer reads to learn what
// AHD does, that can drift from code if nobody is checking.
//
// These tests assert the surfaces stay in lockstep. Failure here
// fails the build before merge — the audit's "doc/contracts
// multiplying faster than enforcement tooling" concern, made
// enforceable.

const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(ROOT, "rules.manifest.json");
const LINTER_SPEC_PATH = resolve(ROOT, "docs/LINTER_SPEC.md");
const README_PATH = resolve(ROOT, "README.md");
const HELP_PATH = resolve(ROOT, "src/cli/help.ts");
const BIN_PATH = resolve(ROOT, "bin/ahd.js");

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function ruleIdsInMarkdown(md: string): Set<string> {
  // Rule ids appear as table cells like `| `ahd/foo` | ...`. The
  // backticked id is what we care about; the regex captures every
  // ahd/<segment>(/<segment>)* token wrapped in backticks.
  const ids = new Set<string>();
  const re = /`(ahd\/[a-z0-9][a-z0-9/-]*)`/g;
  let m;
  while ((m = re.exec(md)) !== null) ids.add(m[1]);
  return ids;
}

function severityFromSpecRow(md: string, ruleId: string): string | undefined {
  // LINTER_SPEC rows look like:
  //   | `ahd/foo` | css | warn | description |
  // Capture the severity column (3rd cell).
  const escaped = ruleId.replace(/[/-]/g, "\\$&");
  const rowRe = new RegExp(
    `\\|\\s*\`${escaped}\`\\s*\\|[^|]*\\|\\s*([a-z]+)\\s*\\|`,
    "i",
  );
  const m = md.match(rowRe);
  return m ? m[1].toLowerCase() : undefined;
}

describe("rules.manifest.json ↔ docs/LINTER_SPEC.md", () => {
  if (!existsSync(MANIFEST_PATH)) {
    it.skip("manifest missing (run npm run build)", () => {});
    return;
  }
  if (!existsSync(LINTER_SPEC_PATH)) {
    it.skip("LINTER_SPEC.md missing", () => {});
    return;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const spec = readFileSync(LINTER_SPEC_PATH, "utf8");
  const specIds = ruleIdsInMarkdown(spec);
  const manifestIds = new Set<string>(
    manifest.rules.map((r: { id: string }) => r.id),
  );

  it("every rule in the manifest has a row in LINTER_SPEC.md", () => {
    const missing = [...manifestIds].filter((id) => !specIds.has(id));
    if (missing.length > 0) {
      throw new Error(
        `Rules in code/manifest but not documented in LINTER_SPEC.md:\n  - ${missing.join("\n  - ")}\nAdd a row to the appropriate section in docs/LINTER_SPEC.md.`,
      );
    }
    expect(missing.length).toBe(0);
  });

  it("every rule id in LINTER_SPEC.md is a real rule in the manifest", () => {
    const orphaned = [...specIds].filter((id) => !manifestIds.has(id));
    if (orphaned.length > 0) {
      throw new Error(
        `Rules documented in LINTER_SPEC.md but not in code/manifest:\n  - ${orphaned.join("\n  - ")}\nEither add the rule to code or remove the row from LINTER_SPEC.md.`,
      );
    }
    expect(orphaned.length).toBe(0);
  });

  it("severity declared in LINTER_SPEC.md matches the manifest severity", () => {
    const mismatches: string[] = [];
    for (const entry of manifest.rules) {
      const specSeverity = severityFromSpecRow(spec, entry.id);
      if (!specSeverity) continue; // row exists but severity column was matched differently; covered by other tests
      if (specSeverity !== entry.severity) {
        mismatches.push(
          `${entry.id}: spec says ${specSeverity}, manifest says ${entry.severity}`,
        );
      }
    }
    if (mismatches.length > 0) {
      throw new Error(
        `Severity drift between LINTER_SPEC.md and rules.manifest.json:\n  - ${mismatches.join("\n  - ")}`,
      );
    }
    expect(mismatches.length).toBe(0);
  });
});

describe("README.md rule counts ↔ rules.manifest.json", () => {
  if (!existsSync(MANIFEST_PATH) || !existsSync(README_PATH)) {
    it.skip("README or manifest missing", () => {});
    return;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const readme = readFileSync(README_PATH, "utf8");
  const counts = manifest.counts.byEngine;

  // README says e.g. "thirty-eight-rule source linter (35 HTML/CSS + 3 SVG),
  // a fourteen-rule vision critic, a six-rule mobile-layout audit".
  // Spell-out → digit table for the cardinals AHD currently advertises.
  const NUM_WORDS: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20,
    "thirty": 30, "thirty-one": 31, "thirty-two": 32,
    "thirty-three": 33, "thirty-four": 34, "thirty-five": 35,
    "thirty-six": 36, "thirty-seven": 37, "thirty-eight": 38,
    "thirty-nine": 39, "forty": 40, "forty-one": 41,
  };
  function spelloutToInt(s: string): number | undefined {
    return NUM_WORDS[s.toLowerCase()];
  }

  function findCount(label: string): number | undefined {
    // Match "thirty-eight-rule source linter" or "thirty-eight-rule
    // vision critic" or "six-rule mobile-layout audit".
    const re = new RegExp(
      `([a-z]+(?:-[a-z]+)?)-rule\\s+${label}`,
      "i",
    );
    const m = readme.match(re);
    if (!m) return undefined;
    return spelloutToInt(m[1]);
  }

  it("README's source-linter rule count matches manifest.counts.byEngine.source", () => {
    // README phrases the count as the per-file source linter ("35 HTML/CSS + 3
    // SVG"). The cross-file rule (whole-site mode only) is documented
    // separately in LINTER_SPEC.md's "Cross-file" section and is not part of
    // the count README advertises, so compare against `source` only.
    const claimed = findCount("source linter");
    const actual = counts.source ?? 0;
    expect(claimed, "README must mention an N-rule source linter").toBeDefined();
    if (claimed !== actual) {
      throw new Error(
        `README claims ${claimed}-rule source linter; manifest reports ${actual} source rules. Update README or check the manifest.`,
      );
    }
  });

  it("README's vision-critic rule count matches manifest.counts.byEngine.vision", () => {
    const claimed = findCount("vision critic");
    const actual = counts.vision ?? 0;
    expect(claimed, "README must mention an N-rule vision critic").toBeDefined();
    if (claimed !== actual) {
      throw new Error(
        `README claims ${claimed}-rule vision critic; manifest reports ${actual} vision rules.`,
      );
    }
  });

  it("README's mobile-audit rule count matches manifest.counts.byEngine.mobile", () => {
    const claimed = findCount("mobile-layout audit");
    const actual = counts.mobile ?? 0;
    expect(claimed, "README must mention an N-rule mobile-layout audit").toBeDefined();
    if (claimed !== actual) {
      throw new Error(
        `README claims ${claimed}-rule mobile-layout audit; manifest reports ${actual} mobile rules.`,
      );
    }
  });
});

describe("bin/ahd.js subcommands ↔ src/cli/help.ts", () => {
  if (!existsSync(HELP_PATH) || !existsSync(BIN_PATH)) {
    it.skip("help or bin missing", () => {});
    return;
  }

  const bin = readFileSync(BIN_PATH, "utf8");
  const help = readFileSync(HELP_PATH, "utf8");

  // Subcommands implemented in bin/ahd.js: each has a `case "<cmd>":`.
  const binCmds = new Set<string>();
  const binRe = /case\s+"([a-z][a-z-]*)"\s*:/g;
  let m;
  while ((m = binRe.exec(bin)) !== null) binCmds.add(m[1]);

  // Subcommands documented in COMMAND_HELP. Each appears as a key in
  // a string-keyed object literal `"<cmd>": \``...``\` or
  // `<cmd>: \``...``\` (unquoted for simple identifiers).
  const helpCmds = new Set<string>();
  const helpKeyRe = /(?:^|\n)\s*"?([a-z][a-z-]*)"?\s*:\s*`/gm;
  while ((m = helpKeyRe.exec(help)) !== null) helpCmds.add(m[1]);

  // Subcommands intentionally not in the help map (utility commands
  // that exist for completeness but would be confusing in help).
  const HELP_EXCLUDED = new Set<string>([]);

  // Keys in COMMAND_HELP that aren't subcommands. `help` is the meta
  // top-level help text shown by `ahd help` (no `case "help":` in the
  // dispatch switch — it's special-cased before the switch). `error`
  // is the generic "unknown command" fallback help body.
  const HELP_KEYS_NOT_COMMANDS = new Set<string>(["help", "error"]);

  it("every implemented subcommand has a help entry", () => {
    const missing = [...binCmds]
      .filter((c) => !helpCmds.has(c))
      .filter((c) => !HELP_EXCLUDED.has(c));
    if (missing.length > 0) {
      throw new Error(
        `Subcommands in bin/ahd.js without an entry in src/cli/help.ts:\n  - ${missing.join("\n  - ")}\nAdd a help entry or list the command in HELP_EXCLUDED with a reason.`,
      );
    }
  });

  it("every help entry maps to a real subcommand", () => {
    const orphaned = [...helpCmds]
      .filter((c) => !binCmds.has(c))
      .filter((c) => !HELP_KEYS_NOT_COMMANDS.has(c));
    if (orphaned.length > 0) {
      throw new Error(
        `Help entries in src/cli/help.ts with no implementation in bin/ahd.js:\n  - ${orphaned.join("\n  - ")}\nEither implement the command or remove the help entry.`,
      );
    }
  });
});
