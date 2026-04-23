import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cfGatewayUrl } from "../src/eval/runners/gateway.js";

describe("CF AI Gateway resolution", () => {
  let prev: string | undefined;
  beforeEach(() => {
    prev = process.env.CF_AI_GATEWAY;
    delete process.env.CF_AI_GATEWAY;
    delete process.env.CLOUDFLARE_AI_GATEWAY;
  });
  afterEach(() => {
    if (prev) process.env.CF_AI_GATEWAY = prev;
  });

  it("returns undefined when no gateway is configured", () => {
    expect(cfGatewayUrl("anthropic")).toBeUndefined();
  });

  it("expands <account>/<gateway> shorthand", () => {
    process.env.CF_AI_GATEWAY = "acc123/gw-design";
    expect(cfGatewayUrl("anthropic")).toBe(
      "https://gateway.ai.cloudflare.com/v1/acc123/gw-design/anthropic",
    );
    expect(cfGatewayUrl("openai")).toBe(
      "https://gateway.ai.cloudflare.com/v1/acc123/gw-design/openai",
    );
    expect(cfGatewayUrl("google-ai-studio")).toBe(
      "https://gateway.ai.cloudflare.com/v1/acc123/gw-design/google-ai-studio",
    );
  });

  it("accepts a full URL only when the host is gateway.ai.cloudflare.com", () => {
    process.env.CF_AI_GATEWAY = "https://gateway.ai.cloudflare.com/v1/acc/gw";
    expect(cfGatewayUrl("anthropic")).toBe(
      "https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic",
    );
  });

  it("rejects a full URL on a non-Cloudflare host (credential-exfil defence)", () => {
    process.env.CF_AI_GATEWAY = "https://gw.example.com/v1/acc/gw";
    expect(() => cfGatewayUrl("anthropic")).toThrow(/gateway\.ai\.cloudflare\.com/);
  });

  it("rejects a non-https URL (provider keys go through it)", () => {
    process.env.CF_AI_GATEWAY = "http://gateway.ai.cloudflare.com/v1/acc/gw";
    expect(() => cfGatewayUrl("anthropic")).toThrow(/https/);
  });

  it("rejects a bare account id without gateway id", () => {
    process.env.CF_AI_GATEWAY = "acc_only";
    expect(() => cfGatewayUrl("anthropic")).toThrow();
  });

  it("CLOUDFLARE_AI_GATEWAY alias works", () => {
    process.env.CLOUDFLARE_AI_GATEWAY = "acc/gw";
    try {
      expect(cfGatewayUrl("openai")).toContain("/acc/gw/openai");
    } finally {
      delete process.env.CLOUDFLARE_AI_GATEWAY;
    }
  });
});
