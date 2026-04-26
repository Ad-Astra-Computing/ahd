import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { createTools, handleStdioLine } from "../src/mcp/server.js";

const TOKENS = resolve(__dirname, "..", "tokens");

describe("mcp server", () => {
  const tools = createTools({ tokensDir: TOKENS });

  it("exposes the documented tool set", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "ahd.list_tokens",
        "ahd.get_token",
        "ahd.brief",
        "ahd.palette",
        "ahd.type_system",
        "ahd.reference",
        "ahd.lint",
        "ahd.vision_rules",
      ]),
    );
  });

  it("initialize returns the protocol handshake", async () => {
    const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.result.serverInfo.name).toBe("ahd-mcp");
    expect(res.result.capabilities.tools).toBeDefined();
  });

  it("tools/list returns every tool with an inputSchema", async () => {
    const req = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.result.tools.length).toBe(tools.length);
    for (const t of res.result.tools) {
      expect(t.inputSchema).toBeDefined();
    }
  });

  it("tools/call ahd.list_tokens returns the seed library", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "ahd.list_tokens", arguments: {} },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.tokens).toContain("swiss-editorial");
    expect(payload.tokens.length).toBeGreaterThanOrEqual(5);
  });

  it("tools/call ahd.brief compiles a minimal brief", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "ahd.brief",
        arguments: {
          intent: "portfolio for a small studio",
          token: "swiss-editorial",
          surfaces: ["web"],
        },
      },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.prompts.claude).toContain("FORBIDDEN");
  });

  it("tools/call on unknown tool returns an error", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "ahd.unknown", arguments: {} },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32601);
  });

  it("preserves the request id on tool invocation errors", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 99,
      method: "tools/call",
      params: { name: "ahd.get_token", arguments: { id: "not-a-real-token" } },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.id).toBe(99);
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32001);
    expect(res.error.data?.tool).toBe("ahd.get_token");
  });

  it("returns invalid-params for ahd.brief with missing required fields", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 100,
      method: "tools/call",
      params: {
        name: "ahd.brief",
        arguments: { intent: "" }, // missing token + surfaces; intent empty
      },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.id).toBe(100);
    expect(res.error.code).toBe(-32602);
    expect(res.error.message).toMatch(/intent|token|surfaces/);
  });

  it("returns parse error with id:null when input is not valid JSON", async () => {
    const res = JSON.parse(await handleStdioLine("{not json", tools));
    expect(res.id).toBeNull();
    expect(res.error.code).toBe(-32700);
  });

  it("returns invalid-request when method is missing", async () => {
    const req = JSON.stringify({ jsonrpc: "2.0", id: 101 });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.id).toBe(101);
    expect(res.error.code).toBe(-32600);
  });

  // Input-validation hardening: every tool's args parse via Zod at
  // the boundary. Loose String() coercion is gone; bad args produce
  // structured -32602 invalid-params with a path-aware message.
  for (const [tool, badArgs] of [
    ["ahd.get_token", { id: "Has_Underscores_Bad" }],
    ["ahd.palette", { token: "Has_Underscores_Bad" }],
    ["ahd.type_system", { token: 12345 }],
    ["ahd.reference", { token: "../../escape" }],
    ["ahd.list_tokens", { unexpected: "extra-arg" }],
    ["ahd.vision_rules", { unexpected: "extra-arg" }],
    ["ahd.lint", { html: 12345 }],
  ] as const) {
    it(`${tool} returns invalid-params on malformed args`, async () => {
      const req = JSON.stringify({
        jsonrpc: "2.0",
        id: 200,
        method: "tools/call",
        params: { name: tool, arguments: badArgs },
      });
      const res = JSON.parse(await handleStdioLine(req, tools));
      expect(res.id).toBe(200);
      expect(res.error.code).toBe(-32602);
    });
  }

  it("ahd.lint enforces the 1 MiB size cap on html via the schema", async () => {
    const big = "<div>".repeat(300_000); // > 1 MiB
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 300,
      method: "tools/call",
      params: { name: "ahd.lint", arguments: { html: big } },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.id).toBe(300);
    expect(res.error.code).toBe(-32602);
  });

  it("ahd.get_token rejects an additional/unknown property", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 301,
      method: "tools/call",
      params: { name: "ahd.get_token", arguments: { id: "swiss-editorial", extra: 1 } },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.id).toBe(301);
    expect(res.error.code).toBe(-32602);
  });
});
