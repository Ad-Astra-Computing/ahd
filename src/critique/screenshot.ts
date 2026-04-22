import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";
import {
  ensureUrlIsPublicOrThrow,
  installRequestGuard,
  type UrlGuardOptions,
} from "./url-safety.js";

export interface ScreenshotOptions {
  viewport?: { width: number; height: number };
  fullPage?: boolean;
  // For renderHtmlToPng: when true, the HTML is treated as untrusted
  // sample content. JavaScript is disabled and subresource loading is
  // blocked, so malicious scripts in a model-generated sample can't
  // run or fetch anything.
  untrustedSample?: boolean;
  // For renderUrlToPng / auditMobile: when set, skip the public-URL
  // guard. Intended for tests and for the rare case where a user
  // explicitly wants to audit a local dev server. Never default to
  // true.
  allowUnsafeUrl?: boolean;
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
  // macOS fallbacks: pkgs.chromium isn't supported on darwin, so on Macs
  // we fall back to Chromium.app or Google Chrome if installed. The flake
  // also ships playwright-driver.browsers on darwin (see flake.nix) which
  // exports AHD_CHROMIUM_PATH when used via `nix develop`.
  out.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  out.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const home = process.env.HOME;
  if (home) {
    out.push(`${home}/Applications/Chromium.app/Contents/MacOS/Chromium`);
    out.push(`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`);
  }
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
    // When the caller flags the HTML as an untrusted sample (model-
    // generated content we're critiquing), turn off JS and block every
    // subresource request so a hostile sample can't exfiltrate anything
    // or fingerprint the runner. When trusted (the site's own compiled
    // output), keep defaults.
    const context = await browser.newContext({
      viewport: options.viewport ?? DEFAULT_VIEWPORT,
      deviceScaleFactor: 2,
      javaScriptEnabled: !options.untrustedSample,
    });
    if (options.untrustedSample) {
      // Block every outbound request — the sample gets rendered from
      // its own HTML only, no images, fonts, stylesheets-via-CDN, XHRs.
      // Screenshots may look less complete; that's the correct tradeoff
      // for untrusted input.
      await context.route("**/*", (route) => route.abort("blockedbyclient"));
    }
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

export async function renderUrlToPng(
  url: string,
  outPath: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  // Defence layer 1+2: syntactic + DNS guard on the user-supplied URL.
  // Throws UrlBlockedError if the target is localhost, any private /
  // link-local / metadata range, or a public name that DNS-resolves
  // into those ranges.
  await ensureUrlIsPublicOrThrow(url, { allowUnsafe: options.allowUnsafeUrl });

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
    // Defence layer 3: belt-and-braces request interceptor that
    // aborts any in-page request (main, subresource, redirect) whose
    // target URL is itself a private address. Catches DNS-rebinding
    // attacks that flipped the DNS answer between layer 2 and
    // navigation.
    if (!options.allowUnsafeUrl) {
      await installRequestGuard(context);
    }
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({
      path: resolvePath(outPath),
      fullPage: options.fullPage ?? true,
      type: "png",
    });
  } finally {
    await browser.close();
  }
}

export async function fileToBase64(path: string): Promise<string> {
  const buf = await readFile(resolvePath(path));
  return buf.toString("base64");
}
