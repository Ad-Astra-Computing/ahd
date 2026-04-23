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
