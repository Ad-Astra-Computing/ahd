import { existsSync } from "node:fs";

// Single source of truth for Chromium discovery. Both the vision
// critic (src/critique/screenshot.ts) and the mobile audit
// (src/mobile/audit.ts) launch Chromium via playwright-core, which
// does not bundle browsers; each runner must locate an executable.
// Keeping the candidate list in one place means a new platform path
// only has to be added once.
//
// AHD_CHROMIUM_PATH is honoured first so the flake (and CI) can pin
// an exact binary; CHROMIUM_PATH is accepted as a legacy alias.

function candidateChromiumPaths(): string[] {
  const out: string[] = [];
  const env = process.env.AHD_CHROMIUM_PATH ?? process.env.CHROMIUM_PATH;
  if (env) out.push(env);
  // nix-shell / nix build provides these
  out.push("/run/current-system/sw/bin/chromium");
  out.push("/usr/bin/chromium");
  out.push("/usr/bin/chromium-browser");
  out.push("/opt/homebrew/bin/chromium");
  // macOS fallbacks: pkgs.chromium isn't supported on darwin, so on
  // Macs we fall back to Chromium.app or Google Chrome if installed.
  // The flake also ships playwright-driver.browsers on darwin (see
  // flake.nix) which exports AHD_CHROMIUM_PATH when used via
  // `nix develop`.
  out.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  out.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const home = process.env.HOME;
  if (home) {
    out.push(`${home}/Applications/Chromium.app/Contents/MacOS/Chromium`);
    out.push(`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`);
  }
  return out;
}

export async function resolveChromiumExecutable(): Promise<string | undefined> {
  for (const p of candidateChromiumPaths()) {
    if (existsSync(p)) return p;
  }
  return undefined;
}
