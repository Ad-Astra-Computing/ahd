// Small typographic ornament for the CLI help header. Rendered only when
// stdout is an interactive terminal; piped output (e.g. `ahd --help | less`,
// CI job logs, `ahd --help > FILE`) gets plain text so downstream consumers
// don't have to strip box-drawing noise.

const ORNAMENT = "━━━━━ ahd ━━━━━";

export interface BannerOptions {
  isTTY?: boolean;
}

export function renderBanner(options: BannerOptions = {}): string {
  const isTTY = options.isTTY ?? Boolean(process.stdout.isTTY);
  return isTTY ? ORNAMENT + "\n" : "";
}

export { ORNAMENT };
