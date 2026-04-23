import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { MOBILE_RULES, type MobileRule } from "./rules.js";
import type { Violation } from "../lint/types.js";

export interface MobileAuditOptions {
  url: string;
  viewport?: { width: number; height: number };
  screenshotPath?: string;
}

export interface MobileAuditReport {
  url: string;
  viewport: { width: number; height: number };
  runAt: string;
  violations: Violation[];
  rulesRun: string[];
  screenshot?: string;
}

// iPhone mini / SE size. The narrowest widely-used width in 2026;
// anything that renders at 375px renders at 390px + too.
const DEFAULT_VIEWPORT = { width: 375, height: 812 };

function candidateChromiumPaths(): string[] {
  const out: string[] = [];
  const env = process.env.AHD_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
  if (env) out.push(env);
  out.push("/run/current-system/sw/bin/chromium");
  out.push("/usr/bin/chromium");
  out.push("/usr/bin/chromium-browser");
  out.push("/opt/homebrew/bin/chromium");
  out.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  out.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const home = process.env.HOME;
  if (home) {
    out.push(`${home}/Applications/Chromium.app/Contents/MacOS/Chromium`);
    out.push(`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`);
  }
  return out;
}

async function resolveChromium(): Promise<string | undefined> {
  for (const p of candidateChromiumPaths()) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function auditMobile(
  options: MobileAuditOptions,
): Promise<MobileAuditReport> {
  const viewport = options.viewport ?? DEFAULT_VIEWPORT;
  const executablePath = await resolveChromium();
  const browser = await chromium.launch({ headless: true, executablePath });
  const violations: Violation[] = [];
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      // User agent announces a mobile device so any server-side UA
      // sniffing (should be rare in 2026) picks the mobile path.
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(options.url, { waitUntil: "networkidle", timeout: 30000 });

    for (const rule of MOBILE_RULES) {
      try {
        const raw = await page.evaluate(rule.check);
        for (const v of raw) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: options.url,
            message: v.message,
            snippet: v.snippet,
            line: undefined,
          });
        }
      } catch (err) {
        violations.push({
          ruleId: rule.id,
          severity: "error",
          file: options.url,
          message: `mobile rule threw: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (options.screenshotPath) {
      await page.screenshot({
        path: options.screenshotPath,
        fullPage: true,
        type: "png",
      });
    }
  } finally {
    await browser.close();
  }

  return {
    url: options.url,
    viewport,
    runAt: new Date().toISOString(),
    violations,
    rulesRun: MOBILE_RULES.map((r) => r.id),
    screenshot: options.screenshotPath,
  };
}

export function formatMobileReport(r: MobileAuditReport): string {
  const lines: string[] = [];
  lines.push(`ahd audit-mobile · ${r.url} · ${r.viewport.width}×${r.viewport.height} · ${r.runAt}`);
  lines.push("");
  if (r.violations.length === 0) {
    lines.push(`clean · ${r.rulesRun.length} mobile rules checked`);
    return lines.join("\n");
  }
  const bySev = { error: 0, warn: 0, info: 0 };
  for (const v of r.violations) {
    bySev[v.severity]++;
    lines.push(`${v.severity.padEnd(5)} ${v.ruleId}\n    ${v.message}`);
    if (v.snippet) lines.push(`    → ${v.snippet}`);
  }
  lines.push("");
  lines.push(
    `${bySev.error} error · ${bySev.warn} warn · ${bySev.info} info · ${r.rulesRun.length} rules`,
  );
  return lines.join("\n");
}
