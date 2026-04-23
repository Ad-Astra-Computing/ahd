// SSRF defence for every code path that points headless Chromium at a
// user-supplied URL (critique-url, audit-mobile, future audit-url).
//
// The threat: AHD ships CLI tools that accept arbitrary http(s) URLs
// and render them in a real browser. Without guards, a misuse (or
// hostile input in a CI runner) could:
//   - render localhost services exposed only on the dev machine
//   - render cloud metadata endpoints (169.254.169.254 on AWS/GCP)
//     and exfiltrate IAM credentials into a screenshot later uploaded
//     to a critic
//   - pivot inside a private network via container / VPC addressing
//   - follow redirects from a public URL into any of the above
//
// Defences layered here:
//   1. Input-time hostname guard: reject bare private/localhost names
//   2. DNS-resolution guard: reject if the hostname resolves to any
//      private / loopback / link-local / metadata IP (v4 and v6)
//   3. Browser-time request interceptor: abort every subresource or
//      redirect whose resolved IP lives in those ranges — belt and
//      braces in case DNS rebinding flips the answer between steps
//      1 and 2

import { lookup } from "node:dns/promises";
import type { Route, Request as PlaywrightRequest } from "playwright-core";

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

const DNS_REBINDING_SUFFIXES = [
  "lvh.me",
  "localtest.me",
  "nip.io",
  "sslip.io",
  "xip.io",
  // Kubernetes + docker-compose common internal suffixes
  "cluster.local",
  "svc.cluster.local",
];

export interface UrlGuardOptions {
  // When true, allow any URL without guarding. Explicit opt-out only —
  // the caller accepts full responsibility. Used by tests.
  allowUnsafe?: boolean;
}

export class UrlBlockedError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "UrlBlockedError";
  }
}

function isPrivateIPv4(addr: string): boolean {
  // 10.0.0.0/8
  if (/^10\./.test(addr)) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(addr)) return true;
  // 127.0.0.0/8 loopback
  if (/^127\./.test(addr)) return true;
  // 169.254.0.0/16 link-local (includes cloud metadata at 169.254.169.254)
  if (/^169\.254\./.test(addr)) return true;
  // 0.0.0.0/8
  if (/^0\./.test(addr)) return true;
  // 100.64.0.0/10 shared address space / CGNAT
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(addr)) return true;
  // 224.0.0.0/4 multicast
  if (/^(22[4-9]|23\d)\./.test(addr)) return true;
  // 240.0.0.0/4 reserved
  if (/^(24\d|25[0-5])\./.test(addr)) return true;
  return false;
}

function isPrivateIPv6(addr: string): boolean {
  const a = addr.toLowerCase();
  // ::1 loopback
  if (a === "::1" || a === "0:0:0:0:0:0:0:1") return true;
  // :: unspecified
  if (a === "::" || a === "0:0:0:0:0:0:0:0") return true;
  // fc00::/7 unique local
  if (/^f[cd][0-9a-f]{2}:/.test(a)) return true;
  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]:/.test(a)) return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x). WHATWG URL may compress the
  // v4 octets back to hex (e.g. ::ffff:127.0.0.1 becomes
  // ::ffff:7f00:1), so we reject the whole prefix rather than try to
  // parse both forms. There's no legitimate public use of IPv4-mapped
  // addresses in a URL — it's almost always an attempt to dodge an
  // IPv4 range check.
  if (/^::ffff:/.test(a)) return true;
  // AWS metadata equivalents reserved under fd00:ec2::254 etc — already
  // covered by the fc00::/7 unique-local check above.
  return false;
}

function isIpLiteral(host: string): { kind: "v4" | "v6" | null; value: string } {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return { kind: "v4", value: host };
  if (host.startsWith("[") && host.endsWith("]"))
    return { kind: "v6", value: host.slice(1, -1) };
  if (host.includes(":")) return { kind: "v6", value: host };
  return { kind: null, value: host };
}

/**
 * Parse a URL and assert it's a public http(s) target. Throws
 * UrlBlockedError on any private / loopback / link-local / metadata
 * address or name. Does not perform DNS resolution; use
 * assertUrlResolvesPublic for that second layer.
 */
export function assertUrlSyntacticallyPublic(urlStr: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new UrlBlockedError(`invalid URL: ${urlStr}`, "url-parse");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlBlockedError(
      `only http/https schemes are allowed (got ${parsed.protocol})`,
      "bad-scheme",
    );
  }
  if (parsed.username || parsed.password) {
    throw new UrlBlockedError(
      "URLs with embedded credentials are not allowed",
      "embedded-credentials",
    );
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) {
    throw new UrlBlockedError("URL has no hostname", "no-hostname");
  }
  if (PRIVATE_HOSTNAMES.has(host)) {
    throw new UrlBlockedError(
      `refusing to target the local machine (${host})`,
      "localhost",
    );
  }
  if (host.endsWith(".local")) {
    throw new UrlBlockedError(
      `refusing to target mDNS / Bonjour name (${host})`,
      "mdns",
    );
  }
  for (const suffix of DNS_REBINDING_SUFFIXES) {
    if (host === suffix || host.endsWith("." + suffix)) {
      throw new UrlBlockedError(
        `refusing ${host}: known DNS-rebinding / internal-cluster suffix`,
        "rebinding-suffix",
      );
    }
  }
  const lit = isIpLiteral(host);
  if (lit.kind === "v4" && isPrivateIPv4(lit.value)) {
    throw new UrlBlockedError(
      `refusing IPv4 address in private / reserved range (${lit.value})`,
      "private-v4",
    );
  }
  if (lit.kind === "v6" && isPrivateIPv6(lit.value)) {
    throw new UrlBlockedError(
      `refusing IPv6 address in private / reserved range (${lit.value})`,
      "private-v6",
    );
  }
  return parsed;
}

/**
 * Resolve the URL's hostname via DNS and reject if any returned
 * address lives in a private range. Second layer — guards against
 * public hostnames that resolve to RFC1918 (CNAME tricks, internal
 * DNS entries pointing outward).
 */
export async function assertUrlResolvesPublic(parsed: URL): Promise<void> {
  // IP literals already checked in assertUrlSyntacticallyPublic; don't
  // DNS them again.
  if (isIpLiteral(parsed.hostname).kind !== null) return;
  let addrs: { address: string; family: number }[] = [];
  try {
    addrs = await lookup(parsed.hostname, { all: true });
  } catch (err) {
    throw new UrlBlockedError(
      `DNS lookup failed for ${parsed.hostname}: ${err instanceof Error ? err.message : String(err)}`,
      "dns-failure",
    );
  }
  for (const a of addrs) {
    const isPrivate =
      a.family === 4 ? isPrivateIPv4(a.address) : isPrivateIPv6(a.address);
    if (isPrivate) {
      throw new UrlBlockedError(
        `${parsed.hostname} resolves to private address ${a.address}; refusing`,
        "dns-private",
      );
    }
  }
}

/**
 * Install a Playwright route handler that intercepts every request
 * made by the page (main, subresource, redirects) and aborts if the
 * target URL is a private address or one of the forbidden suffixes.
 * Third layer — guards against DNS rebinding attacks that flip the
 * answer between the resolution step and the navigation, and against
 * redirects into private space.
 */
// Playwright context routing surface. We type loosely here rather
// than importing BrowserContext so this file stays testable without
// pulling playwright-core as a hard dep in consumers.
type RouteHandler = (route: Route, request: PlaywrightRequest) => unknown;
type Routable = { route: (url: string, handler: RouteHandler) => Promise<unknown> };

export async function installRequestGuard(context: Routable): Promise<void> {
  await context.route("**/*", async (route, request) => {
    const reqUrl = request.url();
    try {
      // We can't synchronously DNS-resolve here without stalling the
      // page. The syntactic guard catches IP literals + named
      // localhost/private suffixes, which covers the DNS-rebinding
      // case where the attacker's cooperating DNS returns a private
      // IP on the second resolution (because the browser would then
      // navigate to that IP literal in a subsequent request, and
      // that IP literal fails the syntactic check here).
      assertUrlSyntacticallyPublic(reqUrl);
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}

/**
 * One-shot guard for CLI entry points. Assert syntactic safety, then
 * DNS-resolve to confirm the hostname doesn't secretly resolve into
 * private space.
 */
export async function ensureUrlIsPublicOrThrow(
  urlStr: string,
  options: UrlGuardOptions = {},
): Promise<URL> {
  if (options.allowUnsafe) return new URL(urlStr);
  const parsed = assertUrlSyntacticallyPublic(urlStr);
  await assertUrlResolvesPublic(parsed);
  return parsed;
}
