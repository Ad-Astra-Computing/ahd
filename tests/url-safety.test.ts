import { describe, it, expect } from "vitest";
import {
  assertUrlSyntacticallyPublic,
  UrlBlockedError,
} from "../src/critique/url-safety.js";

describe("url-safety · assertUrlSyntacticallyPublic", () => {
  it("accepts ordinary public URLs", () => {
    expect(() =>
      assertUrlSyntacticallyPublic("https://example.com/path?q=1"),
    ).not.toThrow();
    expect(() =>
      assertUrlSyntacticallyPublic("http://github.com"),
    ).not.toThrow();
  });

  it("rejects file:, javascript:, ftp:, data: and others", () => {
    for (const u of [
      "file:///etc/passwd",
      "javascript:alert(1)",
      "ftp://ftp.example.com/",
      "data:text/html,<h1>x</h1>",
    ]) {
      expect(() => assertUrlSyntacticallyPublic(u)).toThrow(UrlBlockedError);
    }
  });

  it("rejects localhost and loopback names", () => {
    for (const h of ["localhost", "ip6-localhost", "ip6-loopback"]) {
      expect(() =>
        assertUrlSyntacticallyPublic(`https://${h}/`),
      ).toThrow(UrlBlockedError);
    }
  });

  it("rejects IPv4 literals in private / reserved ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254", // AWS / GCP metadata
      "0.0.0.0",
    ]) {
      expect(() =>
        assertUrlSyntacticallyPublic(`http://${ip}/`),
      ).toThrow(UrlBlockedError);
    }
  });

  it("rejects IPv6 loopback and link-local", () => {
    for (const ip of [
      "[::1]",
      "[fe80::1]",
      "[fc00::1]",
      "[::ffff:127.0.0.1]",
    ]) {
      expect(() =>
        assertUrlSyntacticallyPublic(`http://${ip}/`),
      ).toThrow(UrlBlockedError);
    }
  });

  it("rejects DNS-rebinding suffixes and .local mDNS", () => {
    for (const h of [
      "foo.lvh.me",
      "127-0-0-1.nip.io",
      "example.localtest.me",
      "service.cluster.local",
      "myhost.local",
    ]) {
      expect(() =>
        assertUrlSyntacticallyPublic(`https://${h}/`),
      ).toThrow(UrlBlockedError);
    }
  });

  it("rejects embedded credentials in URL", () => {
    expect(() =>
      assertUrlSyntacticallyPublic("https://user:pass@example.com/"),
    ).toThrow(/credentials/i);
  });

  it("accepts a public IPv4 literal (8.8.8.8)", () => {
    // Public IPs are not blocked by this layer; the audit CLI separately
    // chooses to reject IP literals for its own UX reasons (see
    // functions/_lib.js validHostname). Here we just check the safety
    // guard doesn't over-block.
    expect(() =>
      assertUrlSyntacticallyPublic("https://8.8.8.8/"),
    ).not.toThrow();
  });
});

describe("url-safety · installRequestGuard DNS check", () => {
  it("installs a route handler and resolves hostnames with caching", async () => {
    // Integration-ish: stub a Routable that records the handler, then
    // invoke it against a series of requests. Hostnames that resolve
    // publicly should be continued; names that syntactically hit the
    // private list should be aborted. The point of this test is that
    // the handler wires cache + resolution, not to mock the whole
    // DNS-resolving happy path (which would require monkeypatching
    // node:dns).
    const { installRequestGuard } = await import("../src/critique/url-safety.js");
    let installedHandler: ((route: any, req: any) => any) | null = null;
    const ctx = {
      route: async (_pattern: string, handler: (route: any, req: any) => any) => {
        installedHandler = handler;
      },
    };
    await installRequestGuard(ctx);
    expect(typeof installedHandler).toBe("function");

    const results: string[] = [];
    const makeRoute = () => ({
      abort: async (reason: string) => results.push(`abort:${reason}`),
      continue: async () => results.push("continue"),
    });
    const makeReq = (url: string) => ({ url: () => url });

    // Blocked by syntactic layer — no DNS.
    await installedHandler!(makeRoute(), makeReq("http://127.0.0.1/"));
    await installedHandler!(makeRoute(), makeReq("http://localhost/"));
    expect(results).toEqual(["abort:blockedbyclient", "abort:blockedbyclient"]);
  });
});
