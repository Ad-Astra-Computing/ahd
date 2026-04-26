import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import {
  tokenToLintConfig,
  mergeConfigs,
  detectActiveToken,
} from "../src/lint/config.js";
import { lintSource } from "../src/lint/engine.js";
import { loadToken } from "../src/load.js";

const TOKENS_DIR = resolve(process.cwd(), "tokens");

describe("tokenToLintConfig", () => {
  it("translates disable[] entries into off overrides", async () => {
    const token = await loadToken(TOKENS_DIR, "post-digital-green");
    const cfg = tokenToLintConfig(token);
    expect(cfg).toBeDefined();
    expect(cfg!.project).toBe("token:post-digital-green");
    const off = cfg!.overrides.filter((o) => o.severity === "off");
    expect(off.length).toBeGreaterThanOrEqual(3);
    const ids = off.map((o) => o.ruleId);
    expect(ids).toContain("ahd/require-type-pairing");
    expect(ids).toContain("ahd/weight-variety");
    expect(ids).toContain("ahd/radius-hierarchy");
    for (const o of off) {
      expect(o.reason.length).toBeGreaterThan(10);
    }
  });

  it("returns undefined when token has no lint-overrides", async () => {
    const token = await loadToken(TOKENS_DIR, "bauhaus-revival");
    const cfg = tokenToLintConfig(token);
    expect(cfg).toBeUndefined();
  });
});

describe("mergeConfigs", () => {
  it("prefers project config on rule-id collision", () => {
    const project = {
      overrides: [
        {
          ruleId: "ahd/require-type-pairing",
          severity: "warn" as const,
          reason: "Project keeps this as a warning, not silenced.",
        },
      ],
    };
    const tokenCfg = {
      project: "token:post-digital-green",
      overrides: [
        {
          ruleId: "ahd/require-type-pairing",
          severity: "off" as const,
          reason: "Token default suppression for single-monospace.",
        },
        {
          ruleId: "ahd/weight-variety",
          severity: "off" as const,
          reason: "Token default suppression for conservative weights.",
        },
      ],
    };
    const merged = mergeConfigs(project, tokenCfg);
    expect(merged).toBeDefined();
    const pairing = merged!.overrides.find(
      (o) => o.ruleId === "ahd/require-type-pairing",
    );
    expect(pairing?.severity).toBe("warn");
    const variety = merged!.overrides.find(
      (o) => o.ruleId === "ahd/weight-variety",
    );
    expect(variety?.severity).toBe("off");
  });

  it("returns the non-undefined input when one side is undefined", () => {
    const cfg = {
      overrides: [
        {
          ruleId: "ahd/no-em-dashes-in-prose",
          severity: "off" as const,
          reason: "test fixture, ignore.",
        },
      ],
    };
    expect(mergeConfigs(cfg, undefined)).toBe(cfg);
    expect(mergeConfigs(undefined, cfg)).toBe(cfg);
    expect(mergeConfigs(undefined, undefined)).toBeUndefined();
  });
});

describe("detectActiveToken", () => {
  it("finds the meta tag with name first, content second", () => {
    const html = `<!doctype html><html><head><meta name="ahd-token" content="post-digital-green"><title>x</title></head></html>`;
    expect(detectActiveToken(html)).toBe("post-digital-green");
  });

  it("finds the meta tag with content first, name second", () => {
    const html = `<!doctype html><html><head><meta content="swiss-editorial" name="ahd-token"></head></html>`;
    expect(detectActiveToken(html)).toBe("swiss-editorial");
  });

  it("finds the HTML comment marker", () => {
    const html = `<!doctype html><!-- ahd:token=neubrutalist-gumroad -->\n<html></html>`;
    expect(detectActiveToken(html)).toBe("neubrutalist-gumroad");
  });

  it("returns undefined when no marker is present", () => {
    const html = `<!doctype html><html><head><title>nothing</title></head></html>`;
    expect(detectActiveToken(html)).toBeUndefined();
  });

  it("rejects an id with invalid characters (no path traversal)", () => {
    const html = `<meta name="ahd-token" content="../../etc/passwd">`;
    // The regex only matches kebab-case ids; anything else falls through.
    expect(detectActiveToken(html)).toBeUndefined();
  });
});

describe("end-to-end token-aware lint", () => {
  it("silences post-digital-green disabled rules when token config is applied", async () => {
    // Output that obeys post-digital-green: single monospace face, two
    // weights, zero radius. Without the token, require-type-pairing and
    // weight-variety would fire. With the token, they should be silent.
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ahd-token" content="post-digital-green">
<title>post-digital-green sample</title>
<style>
:root { --bg: oklch(0.14 0.02 150); --fg: oklch(0.92 0.12 135); }
*{box-sizing:border-box;margin:0;padding:0;border-radius:0;box-shadow:none}
html,body{background:var(--bg);color:var(--fg);font-family:"Berkeley Mono",ui-monospace,monospace;font-weight:400;line-height:1.5}
strong{font-weight:700}
</style>
</head>
<body>
<main>
<h1>ahd</h1>
<p>terminal aesthetic. one face, two weights, no radius.</p>
</main>
</body>
</html>`;

    const token = await loadToken(TOKENS_DIR, "post-digital-green");
    const cfg = tokenToLintConfig(token);

    const baseline = lintSource({ file: "test.html", html, css: "" });
    const tokenAware = lintSource(
      { file: "test.html", html, css: "" },
      undefined,
      cfg,
    );

    const baselineRules = new Set(baseline.violations.map((v) => v.ruleId));
    const tokenAwareRules = new Set(tokenAware.violations.map((v) => v.ruleId));

    // The disabled rules should NOT appear in the token-aware report,
    // even if they fired in baseline.
    for (const id of [
      "ahd/require-type-pairing",
      "ahd/weight-variety",
      "ahd/radius-hierarchy",
    ]) {
      expect(tokenAwareRules.has(id)).toBe(false);
    }

    // The applied overrides surface in the report.
    expect(tokenAware.overrides.length).toBeGreaterThanOrEqual(3);
    const appliedIds = tokenAware.overrides.map((o) => o.ruleId);
    expect(appliedIds).toContain("ahd/require-type-pairing");
  });

  it("does not silence rules that the token did not opt out of", async () => {
    // A real em-dash in prose body — this rule is NOT in
    // post-digital-green's disable list, so it should still fire under
    // token-aware lint.
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ahd-token" content="post-digital-green">
<title>x</title>
<style>html,body{font-family:"Berkeley Mono",monospace;font-weight:400;line-height:1.5}</style>
</head>
<body>
<main>
<p>This sentence has an em-dash — which the rule should still catch.</p>
</main>
</body>
</html>`;

    const token = await loadToken(TOKENS_DIR, "post-digital-green");
    const cfg = tokenToLintConfig(token);

    const tokenAware = lintSource(
      { file: "test.html", html, css: "" },
      undefined,
      cfg,
    );
    const ids = new Set(tokenAware.violations.map((v) => v.ruleId));
    expect(ids.has("ahd/no-em-dashes-in-prose")).toBe(true);
  });
});
