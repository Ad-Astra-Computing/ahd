import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";

export interface ScreenshotOptions {
  viewport?: { width: number; height: number };
  fullPage?: boolean;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 1600 };

function candidateChromiumPaths(): string[] {
  const out: string[] = [];
  const env = process.env.AHD_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
  if (env) out.push(env);
  // nix-shell / nix build provides these
  out.push("/run/current-system/sw/bin/chromium");
  out.push("/usr/bin/chromium");
  out.push("/usr/bin/chromium-browser");
  out.push("/opt/homebrew/bin/chromium");
  return out;
}

async function resolveChromiumExecutable(): Promise<string | undefined> {
  for (const p of candidateChromiumPaths()) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function renderHtmlToPng(
  html: string,
  outPath: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  try {
    const context = await browser.newContext({
      viewport: options.viewport ?? DEFAULT_VIEWPORT,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 });
    await page.screenshot({
      path: outPath,
      fullPage: options.fullPage ?? true,
      type: "png",
    });
  } finally {
    await browser.close();
  }
}

export async function renderFileToPng(
  htmlPath: string,
  outPath: string,
  options?: ScreenshotOptions,
): Promise<void> {
  const html = await readFile(resolvePath(htmlPath), "utf8");
  await renderHtmlToPng(html, resolvePath(outPath), options);
}

export async function fileToBase64(path: string): Promise<string> {
  const buf = await readFile(resolvePath(path));
  return buf.toString("base64");
}
